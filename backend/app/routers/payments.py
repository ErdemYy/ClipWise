"""
ClipWise — Payments Router

Handles Stripe Checkout Session creation and Secure Webhooks.
"""

import logging
from typing import Any, Dict

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from supabase import Client as SupabaseClient

from app.config import get_settings
from app.dependencies import get_current_user, get_db

logger = logging.getLogger("clipwise.payments")
router = APIRouter()

settings = get_settings()

if settings.stripe_api_key:
    stripe.api_key = settings.stripe_api_key

# Define Packages
PACKAGES = {
    "starter": {"price": 1500, "credits": 60, "name": "Başlangıç Paketi"},    # 15.00 USD
    "pro": {"price": 3000, "credits": 150, "name": "Profesyonel Paket"},       # 30.00 USD
    "agency": {"price": 7500, "credits": 500, "name": "Ajans Paketi"},         # 75.00 USD
}


class CheckoutRequest(BaseModel):
    package_id: str


class CheckoutResponse(BaseModel):
    checkout_url: str


@router.post(
    "/create-checkout-session",
    response_model=CheckoutResponse,
    summary="Create Stripe Checkout Session",
)
async def create_checkout_session(
    payload: CheckoutRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Creates a Stripe Checkout Session for a specific package.
    Redirects user to Stripe hosted checkout page.
    """
    if not settings.stripe_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured on the server."
        )

    package = PACKAGES.get(payload.package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package ID."
        )

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': package["name"],
                        'description': f"{package['credits']} Dakika Video İşleme",
                    },
                    'unit_amount': package["price"],
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.frontend_url}/dashboard/pricing?success=true",
            cancel_url=f"{settings.frontend_url}/dashboard/pricing?canceled=true",
            customer_email=current_user.get("email"),
            # Critical: Pass user_id and credits in metadata to process in webhook securely
            metadata={
                "user_id": current_user["id"],
                "package_credits": package["credits"],
                "package_id": payload.package_id
            }
        )

        return CheckoutResponse(checkout_url=session.url)

    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post(
    "/create-portal-session",
    response_model=CheckoutResponse,
    summary="Create Stripe Customer Portal Session",
)
async def create_portal_session(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Creates a Stripe Customer Portal session for the user to manage their billing.
    Finds customer by email.
    """
    if not settings.stripe_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured on the server."
        )

    try:
        # Search for existing Stripe customer by email
        customers = stripe.Customer.search(
            query=f"email:'{current_user.get('email')}'",
            limit=1
        )
        
        if not customers.data:
            # If no customer exists, return to billing page
            return CheckoutResponse(checkout_url=f"{settings.frontend_url}/dashboard/pricing")
            
        customer_id = customers.data[0].id
        
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.frontend_url}/dashboard/settings",
        )
        
        return CheckoutResponse(checkout_url=session.url)

    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: SupabaseClient = Depends(get_db)):
    """
    Stripe Webhook handler.
    Validates signature and processes checkout.session.completed events.
    """
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        # Validate signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError as e:
        logger.warning(f"Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        metadata = session.get("metadata", {})
        user_id = metadata.get("user_id")
        credits_str = metadata.get("package_credits")

        if user_id and credits_str:
            try:
                credits_amount = int(credits_str)
                logger.info(f"Adding {credits_amount} credits to user {user_id}")
                
                # Securely increment credits using the database RPC function
                db.rpc('increment_user_credits', {
                    'user_id': user_id, 
                    'amount': credits_amount
                }).execute()
                
                logger.info(f"✅ Successfully added {credits_amount} credits to user {user_id}")
            except Exception as e:
                logger.error(f"Failed to update user credits in DB: {e}")
                # We return 500 so Stripe retries the webhook later
                raise HTTPException(status_code=500, detail="Database update failed")
        else:
            logger.error(f"Webhook session missing metadata: {session.id}")

    return {"status": "success"}
