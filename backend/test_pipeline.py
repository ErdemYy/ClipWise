#!/usr/bin/env python
"""
ClipWise — Integration & Pipeline Health Check Script

This script verifies the entire backend stack step-by-step:
1. Environment Variables (.env) Check
2. Redis Connection (via CELERY_BROKER_URL)
3. Supabase DB Connection & Querying
4. OpenAI API Key & Model Access (GPT-4o-mini)
5. FFmpeg System Command availability
6. Celery Worker availability check

Run this script using: python test_pipeline.py
"""

import os
import sys
import subprocess
import traceback

# ANSI Escape Codes for beautiful colored terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Windows Command Prompt ANSI support enablement
if sys.platform.startswith("win"):
    os.system("color")


def print_header(title: str):
    print(f"\n{BOLD}{CYAN}=== {title} ==={RESET}")


def print_success(message: str):
    print(f"{BOLD}{GREEN}[✅ BAŞARIL] {message}{RESET}")


def print_warning(message: str):
    print(f"{BOLD}{YELLOW}[⚠️ UYARI] {message}{RESET}")


def print_failed(message: str, error: Exception = None):
    print(f"{BOLD}{RED}[❌ BAŞARISIZ] {message}{RESET}")
    if error:
        print(f"{RED}Hata Detayı:{RESET} {error}")


def main():
    print(f"{BOLD}{CYAN}------------------------------------------------------------{RESET}")
    print(f"{BOLD}{CYAN}       CLIPWISE ENTEGRASYON VE SAĞLIK KONTROL BETİĞİ        {RESET}")
    print(f"{BOLD}{CYAN}------------------------------------------------------------{RESET}")

    # Load environment variables manually if python-dotenv is installed
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print(f"{GREEN}✓ .env dosyası dotenv kütüphanesiyle başarıyla yüklendi.{RESET}")
    except ImportError:
        print_warning("python-dotenv kütüphanesi yüklü değil. Çevre değişkenleri sistemden okunacak.")

    # =========================================================================
    # STEP 1: Environment Variables Check
    # =========================================================================
    print_header("Adım 1: Ortam Değişkenleri (.env) Doğrulaması")
    
    required_envs = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "CELERY_BROKER_URL": os.getenv("CELERY_BROKER_URL"),
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    }

    missing_envs = []
    for var_name, value in required_envs.items():
        if not value or value.strip() == "":
            missing_envs.append(var_name)
            print(f"  - {var_name}: {RED}EKSİK/BOŞ{RESET}")
        else:
            # Mask sensitive keys
            masked_val = value[:8] + "..." + value[-8:] if len(value) > 16 else "***"
            print(f"  - {var_name}: {GREEN}YÜKLENDİ ({masked_val}){RESET}")

    if missing_envs:
        print_failed(f"Kritik çevre değişkenleri eksik: {', '.join(missing_envs)}")
        print_warning("Lütfen .env dosyanızın varlığını ve değişkenlerin doğru yazıldığını kontrol edin.")
    else:
        print_success("Tüm gerekli çevre değişkenleri başarıyla doğrulandı.")

    # =========================================================================
    # STEP 2: Redis Connection Test
    # =========================================================================
    print_header("Adım 2: Redis Bağlantı Testi")
    
    redis_url = required_envs["CELERY_BROKER_URL"]
    if not redis_url:
        print_failed("Redis testi atlandı, CELERY_BROKER_URL tanımlı değil.")
    else:
        try:
            import redis
            print(f"Redis sunucusuna bağlanılıyor: {redis_url}")
            # Strict connection check with short timeout
            r = redis.Redis.from_url(redis_url, socket_timeout=3.0)
            if r.ping():
                print_success("Redis sunucusuna başarıyla PING atıldı ve PONG yanıtı alındı.")
            else:
                raise ConnectionError("Redis ping başarısız oldu.")
        except ImportError:
            print_failed("redis kütüphanesi yüklü değil. Lütfen 'pip install redis' komutunu çalıştırın.")
        except Exception as e:
            print_failed("Redis sunucusuna bağlanılamadı. Redis servisinin açık olduğundan emin olun.", e)

    # =========================================================================
    # STEP 3: Supabase Database Test
    # =========================================================================
    print_header("Adım 3: Supabase Veritabanı Testi")
    
    supabase_url = required_envs["SUPABASE_URL"]
    supabase_key = required_envs["SUPABASE_SERVICE_ROLE_KEY"]

    if not supabase_url or not supabase_key:
        print_failed("Supabase testi atlandı, URL veya Service Role Key eksik.")
    else:
        try:
            from supabase import create_client
            print("Supabase istemcisi oluşturuluyor ve bağlantı test ediliyor...")
            db = create_client(supabase_url, supabase_key)
            
            # Simple read request on 'users' table
            response = db.table("users").select("id").limit(1).execute()
            print_success(f"Supabase veritabanı bağlantısı başarılı! 'users' tablosu okundu.")
        except ImportError:
            print_failed("supabase-py kütüphanesi yüklü değil. Lütfen 'pip install supabase' çalıştırın.")
        except Exception as e:
            print_failed("Supabase veritabanına bağlanırken hata oluştu. RLS veya bağlantı ayarlarını kontrol edin.", e)

    # =========================================================================
    # STEP 4: OpenAI API Authentication
    # =========================================================================
    print_header("Adım 4: OpenAI API Kimlik Doğrulaması")
    
    openai_key = required_envs["OPENAI_API_KEY"]
    if not openai_key:
        print_failed("OpenAI testi atlandı, OPENAI_API_KEY tanımlı değil.")
    else:
        try:
            from openai import OpenAI
            print("OpenAI client oluşturuluyor ve gpt-4o-mini ile doğrulama yapılıyor...")
            client = OpenAI(api_key=openai_key)
            
            # Request tiny test completion
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "Hi. Output exactly 1 word: Success"}],
                max_tokens=5,
                timeout=5.0
            )
            response_text = completion.choices[0].message.content.strip()
            print_success(f"OpenAI API doğrulaması başarılı! Yanıt alındı: '{response_text}'")
        except ImportError:
            print_failed("openai kütüphanesi yüklü değil. Lütfen 'pip install openai' çalıştırın.")
        except Exception as e:
            print_failed("OpenAI API kimlik doğrulaması başarısız. API anahtarını veya bakiyenizi kontrol edin.", e)

    # =========================================================================
    # STEP 5: System FFmpeg Control
    # =========================================================================
    print_header("Adım 5: Sistem FFmpeg Kontrolü")
    
    try:
        print("Sistemde FFmpeg komutunun varlığı sorgulanıyor...")
        result = subprocess.run(
            ["ffmpeg", "-version"], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=5.0
        )
        if result.returncode == 0:
            first_line = result.stdout.split("\n")[0]
            print_success(f"FFmpeg sisteminizde yüklü ve aktif! Sürüm Bilgisi: {first_line}")
        else:
            raise FileNotFoundError("FFmpeg komutu hata kodu döndürdü.")
    except (FileNotFoundError, subprocess.SubprocessError) as e:
        print_failed("Sisteminizde FFmpeg kurulu değil veya PATH çevre değişkenine eklenmemiş.", e)
        print_warning("Video kırpma ve altyazı giydirme işlemlerinin çalışması için FFmpeg KURULUMU ZORUNLUDUR.")

    # =========================================================================
    # STEP 6: Celery Worker Control
    # =========================================================================
    print_header("Adım 6: Celery İşçi (Worker) Kontrolü")
    
    if not redis_url:
        print_failed("Celery testi atlandı, Redis URL'i tanımlı değil.")
    else:
        try:
            from celery import Celery
            print("Celery uygulaması başlatılıyor ve aktif worker'lar denetleniyor...")
            
            # Temporary test celery instance linked to broker
            celery_app = Celery("test_pipeline", broker=redis_url)
            inspect = celery_app.control.inspect(timeout=3.0)
            ping_result = inspect.ping()
            
            if ping_result:
                workers = list(ping_result.keys())
                print_success(f"Aktif Celery worker'lar tespit edildi: {', '.join(workers)}")
            else:
                print_warning(
                    "Aktif bir Celery worker (işçi) bulunamadı! "
                    "Kuyruğa atılan video işleme görevlerinin çalışması için arka planda worker'ın açık olması gerekir.\n"
                    "Başlatmak için: celery -A app.workers.celery_app worker --loglevel=info"
                )
        except ImportError:
            print_failed("celery kütüphanesi yüklü değil. Lütfen 'pip install celery' çalıştırın.")
        except Exception as e:
            print_failed("Celery worker kontrolü sırasında beklenmeyen bir hata oluştu.", e)

    print(f"\n{BOLD}{CYAN}------------------------------------------------------------{RESET}")
    print(f"{BOLD}{CYAN}                     TEST TAMAMLANDI!                       {RESET}")
    print(f"{BOLD}{CYAN}------------------------------------------------------------{RESET}")


if __name__ == "__main__":
    main()
