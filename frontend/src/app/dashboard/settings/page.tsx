"use client";

import { useState, useEffect } from "react";
import { User, CreditCard, Sliders, CheckCircle2, DownloadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";

type Tab = "profile" | "billing" | "preferences";

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Set initial tab from URL or default to profile
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab;
    if (tab === "profile" || tab === "billing" || tab === "preferences") {
      setActiveTab(tab);
    } else {
      setActiveTab("profile");
    }
  }, [searchParams]);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      router.replace(`/dashboard/settings?${params.toString()}`);
    }
  };
  
  const supabase = createClient();

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Form States
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Profile Data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Password Data
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences Data
  const [defaultFont, setDefaultFont] = useState("mrbeast");
  const [defaultLanguage, setDefaultLanguage] = useState("auto");

  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(150); // Default package size

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          setEmail(user.email || "");
          
          // Parse metadata
          const fullName = user.user_metadata?.full_name || "";
          const parts = fullName.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");

          // Fetch preferences
          const { data: prefs } = await supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single();
            
          if (prefs) {
            setDefaultFont(prefs.default_font || "mrbeast");
            setDefaultLanguage(prefs.default_language || "auto");
          }

          // Fetch credits
          const { data: userRow } = await supabase
            .from("users")
            .select("credits_remaining")
            .eq("id", user.id)
            .single();
            
          if (userRow) {
            setCreditsRemaining(userRow.credits_remaining || 0);
            setTotalCredits(userRow.credits_remaining > 150 ? 500 : userRow.credits_remaining > 60 ? 150 : 60); 
          }
        }
      } catch (error) {
        console.error("Ayarlar yüklenemedi:", error);
        showToast('error', 'Ayarlar yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCheckout = async (packageId: string) => {
    try {
      showToast('success', 'Ödeme sayfasına yönlendiriliyorsunuz...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });

      if (!response.ok) throw new Error("Oturum oluşturulamadı");
      const data = await response.json();
      window.location.href = data.checkout_url;
    } catch (error) {
      showToast('error', 'Stripe ödeme sistemine bağlanılamadı.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      showToast('success', 'Müşteri paneline yönlendiriliyorsunuz...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Portal açılamadı");
      const data = await response.json();
      window.location.href = data.checkout_url;
    } catch (error) {
      showToast('error', 'Stripe müşteri paneline bağlanılamadı.');
    }
  };

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Update Auth Metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });

    if (authError) {
      showToast('error', authError.message);
    } else {
      showToast('success', 'Profil başarıyla güncellendi.');
    }
    setIsSavingProfile(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Yeni şifreler eşleşmiyor.');
      return;
    }
    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Şifreniz başarıyla değiştirildi.');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsSavingPassword(false);
  };

  const handleSavePreferences = async () => {
    if (!userId) return;
    setIsSavingPrefs(true);
    
    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        default_font: defaultFont,
        default_language: defaultLanguage,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Render tercihleri kaydedildi.');
    }
    setIsSavingPrefs(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
      </div>
    );
  }

  // Calculate progress bar percentage
  const creditPercentage = Math.min(100, Math.max(0, (creditsRemaining / totalCredits) * 100));
  const planName = creditsRemaining > 60 ? "Profesyonel Paket" : (creditsRemaining > 0 ? "Başlangıç Paketi" : "Ücretsiz Plan");

  return (
    <div className="space-y-8 pb-10 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={cn(
          "fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all animate-in slide-in-from-top-2",
          toastMessage.type === 'success' ? "bg-[#10b981] text-zinc-950" : "bg-red-500 text-white"
        )}>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Ayarlar
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          Hesabınızı, aboneliklerinizi ve video çıktı tercihlerinizi yönetin.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar / Vertical Tabs */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto pb-4 md:pb-0">
            <button
              onClick={() => changeTab("profile")}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === "profile"
                  ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white border border-transparent"
              )}
            >
              <User className="h-4 w-4" />
              Genel Profil
            </button>
            <button
              onClick={() => changeTab("billing")}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === "billing"
                  ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white border border-transparent"
              )}
            >
              <CreditCard className="h-4 w-4" />
              Abonelik & Fatura
            </button>
            <button
              onClick={() => changeTab("preferences")}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === "preferences"
                  ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white border border-transparent"
              )}
            >
              <Sliders className="h-4 w-4" />
              Tercihler
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 animate-in fade-in duration-300">
          
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white">Kişisel Bilgiler</h2>
                <p className="text-sm text-[#71717a] mt-1 mb-6">
                  Profilinizde görünecek ad ve iletişim bilgilerini güncelleyin.
                </p>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Adınız</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Soyadınız</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">E-posta Adresi</label>
                    <input 
                      type="email" 
                      value={email}
                      disabled
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b]/50 px-4 py-2.5 text-sm text-[#71717a] cursor-not-allowed"
                    />
                    <p className="text-xs text-[#71717a] mt-1">Güvenlik sebebiyle e-posta adresinizi buradan değiştiremezsiniz.</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 rounded-xl bg-[#10b981] px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#059669] disabled:opacity-50"
                  >
                    {isSavingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white">Şifre Değiştir</h2>
                <p className="text-sm text-[#71717a] mt-1 mb-6">
                  Hesabınızın güvenliği için şifrenizi güçlü tutun.
                </p>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Mevcut Şifre</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Yeni Şifre</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Yeni Şifre Tekrar</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={isSavingPassword || !newPassword || newPassword !== confirmPassword}
                    className="flex items-center gap-2 rounded-xl border border-[#27272a] bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272a] disabled:opacity-50"
                  >
                    {isSavingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                    Şifreyi Güncelle
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BILLING */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#10b981]/30 bg-[#18181b] p-6 shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-bold text-white">{planName}</h2>
                      <span className="flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2.5 py-0.5 text-xs font-semibold text-[#10b981]">
                        <CheckCircle2 className="h-3 w-3" /> Aktif
                      </span>
                    </div>
                    <p className="text-sm text-[#a1a1aa]">
                      Her ay {totalCredits} dakika video işleme hakkınız bulunur.
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-extrabold text-white">{creditsRemaining}<span className="text-lg text-[#71717a] font-medium">/{totalCredits} dk</span></p>
                    <p className="text-xs text-[#10b981] font-medium mt-1">
                      Kredi bitimine {creditsRemaining} dk kaldı
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6 w-full bg-[#27272a] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#10b981] to-[#059669] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${creditPercentage}%` }}
                  ></div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={() => handleCheckout("pro")}
                    className="rounded-xl bg-[#10b981] px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#059669]"
                  >
                    Kredi Yükle
                  </button>
                  <button 
                    onClick={handleManageSubscription}
                    className="rounded-xl border border-[#3f3f46] bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272a]"
                  >
                    Aboneliği Yönet
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] overflow-hidden">
                <div className="border-b border-[#27272a] p-6">
                  <h2 className="text-lg font-semibold text-white">Fatura Geçmişi</h2>
                  <p className="text-sm text-[#71717a] mt-1">
                    Önceki satın alımlarınızın faturaları.
                  </p>
                </div>
                <div className="divide-y divide-[#27272a]">
                <div className="p-8 text-center">
                  <p className="text-sm text-[#71717a]">Fatura geçmişiniz Stripe müşteri panelinizden görüntülenebilir.</p>
                  <button 
                    onClick={handleManageSubscription}
                    className="mt-4 rounded-xl border border-[#3f3f46] bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272a]"
                  >
                    Faturaları Görüntüle
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white">Render Tercihleri</h2>
                <p className="text-sm text-[#71717a] mt-1 mb-6">
                  Viral videolarınızın varsayılan görünüm ve dil ayarlarını belirleyin.
                </p>
                
                <div className="space-y-6 max-w-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Varsayılan Altyazı Stili</label>
                    <select 
                      value={defaultFont}
                      onChange={(e) => setDefaultFont(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] appearance-none"
                    >
                      <option value="mrbeast">MrBeast Tarzı (Kalın, Sarı & Siyah Gölgeli)</option>
                      <option value="minimal">Minimalist (Beyaz, İnce Font)</option>
                      <option value="hormozi">Alex Hormozi (Dinamik Kelime Vurgulu)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e4e4e7]">Yapay Zekâ Analiz Dili</label>
                    <select 
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981] appearance-none"
                    >
                      <option value="auto">Otomatik Algıla (Önerilen)</option>
                      <option value="tr">Sadece Türkçe</option>
                      <option value="en">Sadece İngilizce</option>
                    </select>
                    <p className="text-xs text-[#71717a] mt-1">Videodaki konuşma dili bu ayara göre analiz edilir.</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-start">
                  <button 
                    onClick={handleSavePreferences}
                    disabled={isSavingPrefs}
                    className="flex items-center gap-2 rounded-xl bg-[#10b981] px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#059669] disabled:opacity-50"
                  >
                    {isSavingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
                    Tercihleri Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
