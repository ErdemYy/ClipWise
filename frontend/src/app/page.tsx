"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Scissors,
  Captions,
  ArrowRight,
  Play,
  Upload,
  BrainCircuit,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white selection:bg-[#10b981] selection:text-white overflow-hidden">
      
      {/* Decorative Gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] rounded-full bg-[#10b981]/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#10b981]/10 blur-[150px]" />
      </div>

      {/* Navbar */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-[#27272a]/50 bg-[#09090b]/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#10b981] to-[#059669] transition-transform duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Scissors className="h-5 w-5 text-zinc-950" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              ClipWise
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-[#e4e4e7] transition-colors hover:text-white hidden sm:block">
              Giriş Yap
            </Link>
            <Link href="/login">
              <button className="rounded-full bg-[#10b981] px-5 py-2 text-sm font-semibold text-zinc-950 transition-all hover:bg-[#059669] hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]">
                Ücretsiz Başla
              </button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div variants={fadeInUp} className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-1.5 text-sm font-medium text-[#10b981]">
              <Sparkles className="h-4 w-4" />
              <span>Yapay Zekâ Destekli Video Kırpma Aracı</span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Uzun Videolarınızı Saniyeler İçinde <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#34d399]">
                Viral Kliplere
              </span> Dönüştürün
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-6 text-lg text-[#a1a1aa] leading-relaxed max-w-2xl mx-auto sm:text-xl">
              Yapay zekâ ile YouTube videolarınızdan TikTok, Reels ve Shorts içeriği üretin. 
              Saatler süren kurgu işlemlerini saniyelere indirin.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/login" className="w-full sm:w-auto">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10b981] px-8 py-4 text-base font-bold text-zinc-950 transition-all hover:bg-[#059669] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] hover:scale-105">
                  Ücretsiz Başla
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3f3f46] bg-transparent px-8 py-4 text-base font-medium text-white transition-all hover:bg-[#27272a] sm:w-auto">
                <Play className="h-5 w-5 fill-white/20" />
                Nasıl Çalışır?
              </button>
            </motion.div>
          </motion.div>

          {/* Hero Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-20 max-w-5xl"
          >
            <div className="relative rounded-2xl border border-[#27272a] bg-[#18181b]/50 p-2 shadow-2xl shadow-[#10b981]/10 backdrop-blur-sm">
              <div className="rounded-xl border border-[#27272a] bg-[#09090b] overflow-hidden flex flex-col">
                {/* Mockup Header */}
                <div className="flex items-center gap-2 border-b border-[#27272a] bg-[#18181b] px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="mx-auto rounded-md bg-[#27272a] px-24 py-1 text-[10px] text-[#71717a]">
                    app.clipwise.ai/dashboard
                  </div>
                </div>
                {/* Mockup Body */}
                <div className="relative aspect-video bg-[url('https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
                  <div className="absolute inset-0 bg-[#09090b]/80 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                    <div className="w-full max-w-2xl space-y-6">
                      <div className="h-14 w-full rounded-2xl border border-[#10b981] bg-[#10b981]/10 flex items-center px-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <span className="text-[#10b981] font-mono text-sm">https://youtube.com/watch?v=viral-video...</span>
                        <div className="ml-auto h-8 w-24 rounded-lg bg-[#10b981] animate-pulse" />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="aspect-[9/16] rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 space-y-2">
                              <div className="h-3 w-3/4 rounded bg-white/20" />
                              <div className="h-3 w-1/2 rounded bg-white/20" />
                            </div>
                            <div className="absolute top-2 right-2 rounded bg-[#10b981] px-1.5 py-0.5 text-[10px] font-bold text-black">
                              %9{9-i} Viral
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 border-t border-[#27272a]/50 bg-[#09090b]">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              İçerik Üretimini <span className="text-[#10b981]">Otomatikleştiren</span> Özellikler
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-[#a1a1aa] max-w-2xl mx-auto">
              Siz sadece linki yapıştırın, geri kalan tüm kurgu, kırpma ve altyazı işlerini yapay zekâmız saniyeler içinde halletsin.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Feature 1 */}
            <motion.div variants={fadeInUp} className="group relative rounded-2xl border border-[#27272a] bg-[#18181b] p-8 transition-all duration-300 hover:border-[#10b981]/50 hover:bg-[#18181b]/80">
              <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl pointer-events-none" />
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">AI Viral Seçimi</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                Yapay zekâmız videonuzu analiz eder, en çok etkileşim alacak, kancası güçlü (hook) anları bulur ve otomatik olarak seçer.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeInUp} className="group relative rounded-2xl border border-[#27272a] bg-[#18181b] p-8 transition-all duration-300 hover:border-[#10b981]/50 hover:bg-[#18181b]/80">
              <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl pointer-events-none" />
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Scissors className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Otomatik Dikey Kırpma</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                Yatay (16:9) videolarınız akıllı yüz tanıma sistemiyle konuşmacıyı merkezde tutacak şekilde kusursuzca dikey (9:16) formata dönüştürülür.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeInUp} className="group relative rounded-2xl border border-[#27272a] bg-[#18181b] p-8 transition-all duration-300 hover:border-[#10b981]/50 hover:bg-[#18181b]/80">
              <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl pointer-events-none" />
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Captions className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-white">Dinamik Altyazılar</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                MrBeast tarzı kalın, renkli ve kelime kelime vurgulanan dinamik altyazılar %99 doğrulukla kliplerinize entegre edilir.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 border-t border-[#27272a]/50">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Nasıl Çalışır?
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-[#a1a1aa]">3 basit adımda viral klipleriniz hazır.</motion.p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-[#10b981]/0 via-[#10b981]/20 to-[#10b981]/0" />

            {[
              { num: "1", title: "Linki Yapıştır", desc: "YouTube video linkini ClipWise paneline yapıştırın.", icon: Upload },
              { num: "2", title: "AI Analiz Etsin", desc: "Yapay zekâ videoyu tarar, kırpar ve altyazıları ekler.", icon: BrainCircuit },
              { num: "3", title: "Klibi İndir", desc: "En yüksek puanlı viral klipleri tek tıkla indirin.", icon: Download },
            ].map((step, index) => (
              <motion.div 
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative flex flex-col items-center text-center z-10"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-[#09090b] bg-[#18181b] shadow-xl relative">
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] text-zinc-950 font-bold">
                    {step.num}
                  </div>
                  <step.icon className="h-8 w-8 text-[#10b981]" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-[#a1a1aa] max-w-[250px]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8 border-t border-[#27272a]/50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-[#10b981]/20 bg-gradient-to-br from-[#18181b] to-[#09090b] px-8 py-16 text-center shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] sm:px-16"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl font-extrabold text-white sm:text-5xl">
                Büyümeye Hazır Mısınız?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-[#a1a1aa]">
                Saatlerinizi kurguya değil, yeni fikirler üretmeye harcayın. ClipWise ile içeriklerinizi hemen şimdi viral kliplere dönüştürün.
              </p>
              <div className="mt-10">
                <Link href="/login">
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10b981] px-10 py-5 text-lg font-bold text-zinc-950 transition-all hover:bg-[#059669] hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:scale-105">
                    Hemen Ücretsiz Başla
                    <ArrowRight className="h-6 w-6" />
                  </button>
                </Link>
                <p className="mt-4 text-sm text-[#71717a]">
                  Kredi kartı gerekmez. Deneme kredisi hediye.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#27272a] bg-[#09090b] py-12">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#71717a] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Scissors className="h-5 w-5 text-[#10b981]" />
            ClipWise AI
          </div>
          <p>© 2026 ClipWise. Tüm Hakları Saklıdır.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Kullanım Şartları</Link>
            <Link href="#" className="hover:text-white transition-colors">Gizlilik Politikası</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
