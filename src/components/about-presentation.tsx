'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Leaf,
  Layers,
  Truck,
  TrendingUp,
  AlertTriangle,
  Award,
  Users,
  Presentation,
  FileText,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  RefreshCw,
  Building2,
  DollarSign,
  HeartHandshake,
  ShieldCheck,
  Zap,
  Maximize2,
  Minimize2,
  Info,
  X,
  Target,
  ArrowUpRight,
} from 'lucide-react';

interface RiskItem {
  id: string;
  category: 'Market' | 'Regulatory' | 'Operational' | 'Financial' | 'Organizational';
  title: string;
  p: number;
  i: number;
  score: number;
  mitigation: string;
  contingency: string;
  trigger: string;
  owner: string;
}

const RISK_DATA: RiskItem[] = [
  {
    id: 'MK-01',
    category: 'Market',
    title: 'Predatory pricing & subsidies by well-funded conglomerates',
    p: 4,
    i: 4,
    score: 16,
    mitigation: 'Hyperlocal lock-in, zero-fee loyalty rewards for top 10% technicians, transparent FairQuote price locking.',
    contingency: 'Subsidize booking fees for repeat customers via local society bulk contracts.',
    trigger: 'Competitor marketing spend surge or >10% customer churn in a specific pincode.',
    owner: 'Head of Growth',
  },
  {
    id: 'RG-01',
    category: 'Regulatory',
    title: 'Mandatory gig-worker reclassification as permanent employees',
    p: 3,
    i: 5,
    score: 15,
    mitigation: 'Full autonomy model (workers set hours and decline freely), no exclusivity clauses, voluntary micro-insurance.',
    contingency: 'Transition core 15% volume to certified franchise agency partners.',
    trigger: 'Draft labor ministry notification or state gig-worker tribunal hearings.',
    owner: 'Chief Legal Officer',
  },
  {
    id: 'OP-01',
    category: 'Operational',
    title: 'Technician no-show or severe transit delay',
    p: 3,
    i: 4,
    score: 12,
    mitigation: 'Hyperlocal 5km radius matching, 15-minute automated re-dispatch to backup standby technician.',
    contingency: 'Instant ₹150 inconvenience credit to customer + priority dispatch within 20 mins.',
    trigger: 'Technician GPS stationary 30 mins before scheduled appointment.',
    owner: 'Operations Director',
  },
  {
    id: 'MK-02',
    category: 'Market',
    title: 'Off-platform cash settlement disintermediation',
    p: 4,
    i: 3,
    score: 12,
    mitigation: '30-day platform warranty strictly void if payment processed off-app; repeated cash transactions flag provider account.',
    contingency: 'Instant 5% cashback on in-app digital settlements to incentivize customers.',
    trigger: 'Customer & provider messaging contains phone number or direct UPI mentions.',
    owner: 'Product Manager',
  },
  {
    id: 'FN-02',
    category: 'Financial',
    title: 'Customer acquisition cost (CAC) inflation in saturated cities',
    p: 3,
    i: 4,
    score: 12,
    mitigation: 'Shift ad budget to organic resident welfare association (RWA) tie-ups and peer referral rewards.',
    contingency: 'Throttle paid ad channels; focus on B2B property management maintenance retainers.',
    trigger: 'Blended CAC exceeds ₹280 for two consecutive weeks.',
    owner: 'Head of Marketing',
  },
  {
    id: 'OR-02',
    category: 'Organizational',
    title: 'Quality degradation and culture decay during team scaling',
    p: 3,
    i: 4,
    score: 12,
    mitigation: 'Codified ProSolution Culture Handbook, mandatory 2-week buddy shadowing, weekly customer review reading.',
    contingency: 'Pause hiring for 30 days to conduct internal operational retuning and retraining sprints.',
    trigger: 'Customer Net Promoter Score (NPS) falls below 65.',
    owner: 'Head of People & Culture',
  },
  {
    id: 'OP-02',
    category: 'Operational',
    title: 'Fraudulent WorkProof photo upload or substandard repair',
    p: 2,
    i: 4,
    score: 8,
    mitigation: 'EXIF camera metadata validation, GPS geotagging, mandatory customer digital sign-off.',
    contingency: 'Free rework dispatched within 4 hours; provider suspended pending review.',
    trigger: 'Customer marks "Job Not Done" on completion prompt.',
    owner: 'Trust & Safety Lead',
  },
  {
    id: 'OP-03',
    category: 'Operational',
    title: 'Database connection exhaustion during festival peak hours',
    p: 2,
    i: 4,
    score: 8,
    mitigation: 'Neon serverless autoscaling compute, connection pooling, Edge read-replicas for catalog browsing.',
    contingency: 'Graceful degradation to cached provider listings with delayed quote queues.',
    trigger: 'Database connection pool usage exceeds 85%.',
    owner: 'CTO / DevOps',
  },
  {
    id: 'FN-01',
    category: 'Financial',
    title: 'High payment dispute / chargeback frequency',
    p: 2,
    i: 3,
    score: 6,
    mitigation: 'Mandatory customer OTP confirmation upon completion before fund release.',
    contingency: 'Escrow buffer fund absorbs verified legitimate customer claims.',
    trigger: 'Chargeback rate crosses 0.5% of gross merchandise value.',
    owner: 'Finance Director',
  },
  {
    id: 'FN-03',
    category: 'Financial',
    title: 'Working capital strain during multi-city launch',
    p: 3,
    i: 3,
    score: 9,
    mitigation: 'Gated geographic expansion: next city unlocks only after prior cluster hits EBITDA breakeven.',
    contingency: 'Draw down ₹15L pre-arranged revolving debt credit facility.',
    trigger: 'Operating cash runway drops below 6 months.',
    owner: 'CFO',
  },
  {
    id: 'RG-02',
    category: 'Regulatory',
    title: 'Customer phone number or home address privacy leak',
    p: 1,
    i: 5,
    score: 5,
    mitigation: 'Virtual proxy telephony and automated address redaction 24 hours after booking close.',
    contingency: 'Instant protocol containment, CERT-In disclosure, and zero-trust key rotation.',
    trigger: 'Unusual bulk data read pattern detected by audit telemetry.',
    owner: 'Security Architect',
  },
  {
    id: 'OR-01',
    category: 'Organizational',
    title: 'Skilled technician churn to informal local referrals',
    p: 3,
    i: 3,
    score: 9,
    mitigation: 'Gamified loyalty tiers, preferential job matching for 4.8+ rated pros, instant daily settlements.',
    contingency: 'Targeted loyalty bonus vouchers for technicians completing 25+ jobs per month.',
    trigger: '30-day active provider retention drops below 75%.',
    owner: 'Operations Lead',
  },
];

export default function AboutPresentation() {
  const [viewMode, setViewMode] = useState<'doc' | 'slides'>('slides');
  const [activeTab, setActiveTab] = useState<number>(1);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);

  // Interactive diagnostic state for Pillar 1
  const [auditScores, setAuditScores] = useState<Record<string, number>>({
    env1: 4,
    env2: 5,
    env3: 4,
    soc1: 5,
    soc2: 4,
    soc3: 4,
    eco1: 5,
    eco2: 4,
    eco3: 4,
  });

  const avgEnv = ((auditScores.env1 + auditScores.env2 + auditScores.env3) / 3).toFixed(1);
  const avgSoc = ((auditScores.soc1 + auditScores.soc2 + auditScores.soc3) / 3).toFixed(1);
  const avgEco = ((auditScores.eco1 + auditScores.eco2 + auditScores.eco3) / 3).toFixed(1);
  const overallAuditScore = (
    (parseFloat(avgEnv) + parseFloat(avgSoc) + parseFloat(avgEco)) /
    3
  ).toFixed(2);

  // Interactive financial calculator for Pillar 4
  const [customTakeRate, setCustomTakeRate] = useState<number>(12);
  const [customCac, setCustomCac] = useState<number>(220);
  const avgTicket = 1250;
  const grossRevPerOrder = (avgTicket * (customTakeRate / 100));
  const varCostPerOrder = 40;
  const unitContribMargin = grossRevPerOrder - varCostPerOrder;
  const customLtv = (4.2 * unitContribMargin).toFixed(0);
  const ltvCacRatio = (parseFloat(customLtv) / customCac).toFixed(2);
  const monthlyFixedCost = 77000;
  const breakEvenMonthlyOrders = Math.ceil(monthlyFixedCost / Math.max(unitContribMargin, 1));

  // Keyboard navigation for presentation mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (viewMode !== 'slides') return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isFullscreen]);

  const slides = [
    {
      domain: 'Executive Summary',
      title: 'ProSolution: Enterprise Scalability & Sustainability Blueprint',
      tagline: 'Comprehensive Strategic Analysis & Production Architecture',
      badge: 'Strategic Whitepaper',
      content: (
        <div className="space-y-6 animate-fade-scale">
          {/* Architectural 3D Hero Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-gradient-to-b from-white to-[#EDE8F5]/50 p-6 shadow-foundation shadow-foundation-hover">
              <div className="h-10 w-10 rounded-2xl bg-[#EDE8F5] border border-[#ADBBDA] flex items-center justify-center text-[#3D52A0] mb-4">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#3D52A0] mb-2">Venture Identity</h3>
              <p className="text-xs text-[#3D52A0]/80 leading-relaxed">
                <strong>ProSolution</strong> is a mobile-first, tech-enabled local services marketplace connecting vetted tradespeople with property owners via transparent quote comparison and verified WorkProof records.
              </p>
            </div>

            <div className="rounded-3xl border border-[#7091E6]/40 bg-gradient-to-b from-white to-[#EDE8F5]/80 p-6 shadow-foundation shadow-foundation-hover relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-[#7091E6]/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div className="h-10 w-10 rounded-2xl bg-[#7091E6]/15 border border-[#7091E6]/30 flex items-center justify-center text-[#7091E6] mb-4">
                <Leaf className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#3D52A0] mb-2">Sustainability Thesis</h3>
              <p className="text-xs text-[#3D52A0]/80 leading-relaxed">
                Hyperlocal route clustering cuts Scope 3 transit emissions by 34%, 100% digital WorkProof verification eradicates paperwork, and 88% direct provider payouts eliminate wage exploitation.
              </p>
            </div>

            <div className="rounded-3xl border border-[#3D52A0]/30 bg-gradient-to-b from-white to-[#EDE8F5]/50 p-6 shadow-foundation shadow-foundation-hover">
              <div className="h-10 w-10 rounded-2xl bg-[#3D52A0]/10 border border-[#3D52A0]/20 flex items-center justify-center text-[#3D52A0] mb-4">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#3D52A0] mb-2">Scalability Engine</h3>
              <p className="text-xs text-[#3D52A0]/80 leading-relaxed">
                Decoupled unit economics: FairQuote automated price corridors, serverless cloud data layer, and multi-sided network effects scale transaction volume while keeping operating headcount flat.
              </p>
            </div>
          </div>

          {/* 7 Pillars Visual Bar */}
          <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white/90 p-5 shadow-foundation">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8697C4]">
                7 Core Strategic Pillars
              </h4>
              <span className="text-[11px] font-semibold text-[#7091E6] bg-[#EDE8F5] px-2.5 py-0.5 rounded-full border border-[#ADBBDA]/60">
                Full Production Alignment
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {[
                { no: 'Pillar 1', name: 'Sustainability Diagnostic', icon: Leaf },
                { no: 'Pillar 2', name: 'Scalable BMC', icon: Layers },
                { no: 'Pillar 3', name: 'Operations & Logistics', icon: Truck },
                { no: 'Pillar 4', name: 'Financial Model', icon: TrendingUp },
                { no: 'Pillar 5', name: 'Risk Governance', icon: AlertTriangle },
                { no: 'Pillar 6', name: 'ESG Dashboard', icon: Award },
                { no: 'Pillar 7', name: 'Human Capital', icon: Users },
              ].map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.no}
                    onClick={() => {
                      setViewMode('doc');
                      setActiveTab(idx + 1);
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/40 hover:bg-[#EDE8F5] text-center transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:border-[#7091E6]"
                  >
                    <Icon className="h-4 w-4 text-[#3D52A0] mb-1.5" />
                    <span className="text-[10px] font-black text-[#3D52A0]">{m.no}</span>
                    <span className="text-[10px] font-medium text-[#8697C4] leading-tight mt-0.5">{m.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 1',
      title: 'Sustainability Diagnostic: Triple Bottom Line (People, Planet, Profit)',
      tagline: 'Comprehensive evaluation across environmental stewardship, social equity, and economic viability',
      badge: 'ESG Rating: 4.3 / 5.0 (B-Corp Ready)',
      content: (
        <div className="space-y-5 animate-fade-scale">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-5 shadow-foundation shadow-foundation-hover">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-[#3D52A0] flex items-center gap-1.5 text-sm">
                  <Leaf className="h-4 w-4 text-[#7091E6]" /> Planet (Environmental)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#3D52A0] border border-[#ADBBDA]">
                  4.3 / 5
                </span>
              </div>
              <ul className="text-xs text-[#3D52A0]/80 space-y-2 list-disc pl-4">
                <li><strong>Local Geo-dispatch:</strong> Minimizes technician vehicular trips to under 4 km average.</li>
                <li><strong>100% Digital Workflow:</strong> Zero physical paper receipts, quotes, or billing slips.</li>
                <li><strong>Scrap Salvage:</strong> In-app advice for recycling discarded copper tubing & electronic PCB parts.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-5 shadow-foundation shadow-foundation-hover">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-[#3D52A0] flex items-center gap-1.5 text-sm">
                  <HeartHandshake className="h-4 w-4 text-[#7091E6]" /> People (Social)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#3D52A0] border border-[#ADBBDA]">
                  4.4 / 5
                </span>
              </div>
              <ul className="text-xs text-[#3D52A0]/80 space-y-2 list-disc pl-4">
                <li><strong>Dignified Provider Pay:</strong> Technicians keep 88% of billing with transparent commission.</li>
                <li><strong>Vetted Safety:</strong> Mandatory identity verification protects both families and workers.</li>
                <li><strong>Anti-Exploitation:</strong> Fair dispute resolution system preventing arbitrary payment withholding.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-5 shadow-foundation shadow-foundation-hover">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-[#3D52A0] flex items-center gap-1.5 text-sm">
                  <DollarSign className="h-4 w-4 text-[#7091E6]" /> Profit (Economic)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#3D52A0] border border-[#ADBBDA]">
                  4.3 / 5
                </span>
              </div>
              <ul className="text-xs text-[#3D52A0]/80 space-y-2 list-disc pl-4">
                <li><strong>Positive Unit Economics:</strong> 73.3% contribution margin on each booked service.</li>
                <li><strong>Low Fixed Tech Stack:</strong> Serverless Postgres + Edge compute avoids idle server costs.</li>
                <li><strong>FairQuote Algorithm:</strong> Prevents price-gouging, ensuring sustainable customer retention.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-[#ADBBDA]/60 bg-white p-4 shadow-foundation">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-2">
              Platform Architectural Implementation
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#EDE8F5]/50 border border-[#ADBBDA]/60">
                <span className="font-mono text-[#3D52A0] font-bold block mb-1">src/lib/rules.ts</span>
                <span className="text-[#8697C4]">Pure business logic enforcing quote expiration, dispute windows, and fair pricing.</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EDE8F5]/50 border border-[#ADBBDA]/60">
                <span className="font-mono text-[#3D52A0] font-bold block mb-1">src/app/complaints</span>
                <span className="text-[#8697C4]">Formal dispute escalation protecting gig-workers and consumers against fraud.</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EDE8F5]/50 border border-[#ADBBDA]/60">
                <span className="font-mono text-[#3D52A0] font-bold block mb-1">src/app/provider/documents</span>
                <span className="text-[#8697C4]">Mandatory KYC & certification review before any provider receives job requests.</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 2',
      title: 'Scalable Business Model Architecture (BMC)',
      tagline: 'Decoupling headcount and linear cost growth using Automation, Outsourcing, and Platform network effects',
      badge: 'Osterwalder BMC Redesign',
      content: (
        <div className="space-y-4 animate-fade-scale">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-5 shadow-foundation shadow-foundation-hover">
              <div className="flex items-center gap-2 font-bold text-[#3D52A0] mb-2">
                <Zap className="h-4 w-4 text-[#7091E6]" /> 1. Automation Mechanism
              </div>
              <p className="text-xs text-[#3D52A0]/80 mb-3">
                <strong>FairQuote Matching:</strong> Customers specify requirements; the platform calculates price fairness and dispatches to matching providers in 15 seconds.
              </p>
              <div className="rounded-xl bg-[#EDE8F5] p-2.5 border border-[#ADBBDA]/70 text-[11px] text-[#3D52A0] font-semibold">
                ⚡ Dispatch latency: 4 hours (manual) → 15 seconds (algorithmic).
              </div>
            </div>

            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-5 shadow-foundation shadow-foundation-hover">
              <div className="flex items-center gap-2 font-bold text-[#3D52A0] mb-2">
                <Layers className="h-4 w-4 text-[#7091E6]" /> 2. Outsourcing Mechanism
              </div>
              <p className="text-xs text-[#3D52A0]/80 mb-3">
                <strong>Asset-Light Infrastructure:</strong> Serverless PostgreSQL on Neon, Vercel Edge compute, and automated identity checking convert fixed IT costs to elastic variable costs.
              </p>
              <div className="rounded-xl bg-[#EDE8F5] p-2.5 border border-[#ADBBDA]/70 text-[11px] text-[#3D52A0] font-semibold">
                ☁️ Server maintenance: Converted 100% into variable $0.001/req.
              </div>
            </div>

            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-5 shadow-foundation shadow-foundation-hover">
              <div className="flex items-center gap-2 font-bold text-[#3D52A0] mb-2">
                <RefreshCw className="h-4 w-4 text-[#7091E6]" /> 3. Platform Mechanism
              </div>
              <p className="text-xs text-[#3D52A0]/80 mb-3">
                <strong>Two-Sided Network Effects:</strong> Verified providers join to earn higher utilization; customer wait times drop; organic referrals accelerate without staff inflation.
              </p>
              <div className="rounded-xl bg-[#EDE8F5] p-2.5 border border-[#ADBBDA]/70 text-[11px] text-[#3D52A0] font-semibold">
                📈 Capacity ceiling: Unlimited concurrent jobs without staff inflation.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-3">
              Baseline Traditional Agency Model vs. Scalable Platform Model
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40">
                <span className="font-bold text-rose-800 block mb-1">❌ Baseline Traditional Contractor Agency</span>
                <p className="text-slate-600">Salaried technicians on company payroll, physical quote paperwork, manual phone coordination, geographical lock-in, linear cost curve.</p>
              </div>
              <div className="p-4 rounded-2xl border border-[#7091E6]/40 bg-[#EDE8F5]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">✅ ProSolution Scalable Platform Model</span>
                <p className="text-[#3D52A0]/80">On-demand verified gig partners, digital FairQuote comparison, photo WorkProof verification, 12% take-rate, decoupled hyper-scalable cost curve.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 3',
      title: 'Operations Architecture & Circular Supply Chain Logistics',
      tagline: 'End-to-end service logistics, volume breakpoint analysis, and 3 embedded circular sustainability practices',
      badge: 'Operations & Logistics',
      content: (
        <div className="space-y-4 animate-fade-scale">
          {/* Visual Step-by-Step Logistics Track */}
          <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-3">
              Fulfillment Operations Flowchart
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-center text-xs">
              <div className="p-3.5 rounded-2xl bg-[#EDE8F5]/70 border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">1. Demand Post</span>
                <span className="text-[#8697C4]">Customer specifies job & uploads photo context.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#EDE8F5]/70 border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">2. FairQuote Match</span>
                <span className="text-[#8697C4]">Nearest 3 verified pros submit competitive bids.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#EDE8F5]/70 border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">3. JIT Parts Dispatch</span>
                <span className="text-[#8697C4]">Technician picks standardized parts from local hub.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#EDE8F5]/70 border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">4. WorkProof Job</span>
                <span className="text-[#8697C4]">Execution with mandatory before/after photos.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#7091E6]/20 border border-[#7091E6]/40">
                <span className="font-bold text-[#3D52A0] block mb-1">5. Eco-Signoff</span>
                <span className="text-[#3D52A0]/80">Digital signoff, scrap recycling & payment payout.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/40 p-4 shadow-foundation shadow-foundation-hover">
              <span className="text-xs font-bold text-[#7091E6] uppercase block mb-1">Circular Intervention 1</span>
              <h6 className="font-bold text-[#3D52A0] text-sm mb-1">Hyperlocal Route Clustering</h6>
              <p className="text-xs text-[#3D52A0]/80">
                Restricting technician dispatch radius to within 5 km cut travel distance from 14 km average to 3.8 km, curtailing vehicular emissions by 34%.
              </p>
            </div>
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/40 p-4 shadow-foundation shadow-foundation-hover">
              <span className="text-xs font-bold text-[#7091E6] uppercase block mb-1">Circular Intervention 2</span>
              <h6 className="font-bold text-[#3D52A0] text-sm mb-1">Certified Eco-Parts Catalog</h6>
              <p className="text-xs text-[#3D52A0]/80">
                Integration of certified low-lead brass fixtures, energy-star capacitors, and recycled copper piping directly into quotation builder.
              </p>
            </div>
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/40 p-4 shadow-foundation shadow-foundation-hover">
              <span className="text-xs font-bold text-[#7091E6] uppercase block mb-1">Circular Intervention 3</span>
              <h6 className="font-bold text-[#3D52A0] text-sm mb-1">Reverse Logistics Scrap Recovery</h6>
              <p className="text-xs text-[#3D52A0]/80">
                Technicians return old copper wires, valves, and defective PCB boards to authorized municipal scrap recovery partners for platform rewards.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 4',
      title: 'Financial Projections, Unit Economics & Capital Plan',
      tagline: 'Multi-year financial modeling demonstrating contribution margin, break-even velocity, and capital requirements',
      badge: 'LTV : CAC = 3.85x | Break-Even: Month 14',
      content: (
        <div className="space-y-4 animate-fade-scale">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-2xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/50 p-3.5 shadow-foundation">
              <span className="text-[11px] font-semibold text-[#8697C4] block">Avg Job GMV</span>
              <span className="text-xl font-black text-[#3D52A0]">₹1,250</span>
              <span className="text-[10px] text-[#8697C4] block">Typical invoice</span>
            </div>
            <div className="rounded-2xl border border-[#7091E6]/40 bg-[#EDE8F5]/80 p-3.5 shadow-foundation">
              <span className="text-[11px] font-semibold text-[#7091E6] block">Take Rate (12%)</span>
              <span className="text-xl font-black text-[#3D52A0]">₹150</span>
              <span className="text-[10px] text-[#7091E6] block">Platform revenue</span>
            </div>
            <div className="rounded-2xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/50 p-3.5 shadow-foundation">
              <span className="text-[11px] font-semibold text-[#8697C4] block">Variable Cost</span>
              <span className="text-xl font-black text-[#3D52A0]">₹40</span>
              <span className="text-[10px] text-[#8697C4] block">Gateway + SMS + Cloud</span>
            </div>
            <div className="rounded-2xl border border-[#3D52A0]/30 bg-gradient-to-br from-[#EDE8F5] to-white p-3.5 shadow-foundation">
              <span className="text-[11px] font-semibold text-[#3D52A0] block">Unit Margin</span>
              <span className="text-xl font-black text-[#3D52A0]">₹110 (73%)</span>
              <span className="text-[10px] text-[#7091E6] block font-bold">Contribution margin</span>
            </div>
          </div>

          {/* Interactive Trajectory SVG Chart */}
          <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4]">
                5-Year Revenue & EBITDA Trajectory (₹ Lakhs)
              </h5>
              <span className="text-[10px] font-bold text-[#7091E6] bg-[#EDE8F5] px-2 py-0.5 rounded-full border border-[#ADBBDA]/60">
                Month 14 Breakeven Crossover
              </span>
            </div>
            {/* SVG Visual Chart */}
            <div className="relative pt-2 pb-1">
              <div className="grid grid-cols-5 gap-4 items-end h-32 px-4 border-b border-[#ADBBDA]/40">
                {[
                  { yr: 'Y1', rev: 27, ebitda: -11, h: 'h-10', eh: 'h-4', color: 'bg-[#7091E6]' },
                  { yr: 'Y2', rev: 97.5, ebitda: 25.5, h: 'h-16', eh: 'h-8', color: 'bg-[#7091E6]' },
                  { yr: 'Y3', rev: 270, ebitda: 125, h: 'h-24', eh: 'h-14', color: 'bg-[#3D52A0]' },
                  { yr: 'Y4', rev: 630, ebitda: 350, h: 'h-28', eh: 'h-20', color: 'bg-[#3D52A0]' },
                  { yr: 'Y5', rev: 1350, ebitda: 830, h: 'h-32', eh: 'h-24', color: 'bg-[#3D52A0]' },
                ].map((col) => (
                  <div key={col.yr} className="flex flex-col items-center gap-1 group">
                    <div className="flex gap-1.5 items-end h-28">
                      <div
                        className={`w-5 rounded-t-lg ${col.color} transition-all duration-300 group-hover:opacity-90`}
                        style={{ height: col.h === 'h-10' ? '28%' : col.h === 'h-16' ? '45%' : col.h === 'h-24' ? '68%' : col.h === 'h-28' ? '82%' : '100%' }}
                        title={`Revenue: ₹${col.rev}L`}
                      ></div>
                      <div
                        className="w-3 rounded-t-lg bg-[#ADBBDA] transition-all duration-300"
                        style={{ height: col.yr === 'Y1' ? '12%' : col.yr === 'Y2' ? '24%' : col.yr === 'Y3' ? '48%' : col.yr === 'Y4' ? '70%' : '88%' }}
                        title={`EBITDA: ₹${col.ebitda}L`}
                      ></div>
                    </div>
                    <span className="text-[11px] font-bold text-[#3D52A0]">{col.yr}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8697C4] pt-2 px-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-[#3D52A0] inline-block"></span> Revenue (12% Take)
                  <span className="h-2.5 w-2.5 rounded bg-[#ADBBDA] inline-block ml-2"></span> EBITDA
                </span>
                <span className="font-semibold text-[#3D52A0]">Y5 Target: ₹13.5 Cr Revenue</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 5',
      title: 'Enterprise Risk Governance & 5x5 Matrix',
      tagline: '12 categorized enterprise risks, quantified probability-impact scoring, and contingency plans',
      badge: 'Risk Governance Framework',
      content: (
        <div className="space-y-4 animate-fade-scale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Heatmap */}
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4]">
                  Interactive 5x5 Risk Heatmap
                </h5>
                <span className="text-[10px] text-[#7091E6] font-semibold">Click box to inspect</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                {/* 5x5 grid visualization */}
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">5</div>
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">10</div>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'RG-01') || null)}
                  className="p-2 rounded-xl bg-[#3D52A0] text-white font-black hover:scale-105 transition shadow-xs"
                >
                  RG-01 (15)
                </button>
                <div className="p-2 rounded-xl bg-rose-500/80 text-white">20</div>
                <div className="p-2 rounded-xl bg-rose-700 text-white">25</div>

                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">4</div>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'OP-02') || null)}
                  className="p-2 rounded-xl bg-[#ADBBDA] text-[#3D52A0] font-bold hover:scale-105 transition"
                >
                  OP-02 (8)
                </button>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'OP-01') || null)}
                  className="p-2 rounded-xl bg-[#7091E6] text-white font-black hover:scale-105 transition shadow-xs"
                >
                  OP-01 (12)
                </button>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'MK-01') || null)}
                  className="p-2 rounded-xl bg-rose-600 text-white font-black hover:scale-105 transition shadow-xs animate-glow"
                >
                  MK-01 (16)
                </button>
                <div className="p-2 rounded-xl bg-rose-600/80 text-white">20</div>

                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">3</div>
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">6</div>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'FN-03') || null)}
                  className="p-2 rounded-xl bg-[#ADBBDA] text-[#3D52A0] font-bold hover:scale-105 transition"
                >
                  FN-03 (9)
                </button>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'MK-02') || null)}
                  className="p-2 rounded-xl bg-[#7091E6] text-white font-black hover:scale-105 transition shadow-xs"
                >
                  MK-02 (12)
                </button>
                <div className="p-2 rounded-xl bg-rose-500/80 text-white">15</div>

                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">2</div>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'OP-03') || null)}
                  className="p-2 rounded-xl bg-[#EDE8F5] border border-[#ADBBDA] text-[#3D52A0] font-bold hover:scale-105 transition"
                >
                  OP-03 (4)
                </button>
                <button
                  onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'FN-01') || null)}
                  className="p-2 rounded-xl bg-[#EDE8F5] border border-[#ADBBDA] text-[#3D52A0] font-bold hover:scale-105 transition"
                >
                  FN-01 (6)
                </button>
                <div className="p-2 rounded-xl bg-[#ADBBDA] text-[#3D52A0]">8</div>
                <div className="p-2 rounded-xl bg-[#7091E6] text-white">10</div>

                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">1</div>
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">2</div>
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">3</div>
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">4</div>
                <div className="p-2 rounded-xl bg-[#EDE8F5] text-[#3D52A0]">5</div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8697C4] mt-2 px-1">
                <span>Impact (1 to 5) →</span>
                <span>↑ Probability (1 to 5)</span>
              </div>
            </div>

            {/* Top Risks Detail Card */}
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation flex flex-col justify-between">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-3">
                  Top Priority Strategic Risks
                </h5>
                <div className="space-y-2.5 text-xs">
                  <div
                    onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'MK-01') || null)}
                    className="p-3 rounded-2xl bg-[#EDE8F5]/60 border border-[#ADBBDA]/70 cursor-pointer hover:border-[#7091E6] transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#3D52A0]">MK-01: Incumbent Predatory Pricing</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white">Score: 16</span>
                    </div>
                    <span className="text-[#3D52A0]/80">Mitigation: Local society lock-in, zero-fee loyalty rewards for top technicians.</span>
                  </div>

                  <div
                    onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'RG-01') || null)}
                    className="p-3 rounded-2xl bg-[#EDE8F5]/60 border border-[#ADBBDA]/70 cursor-pointer hover:border-[#7091E6] transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#3D52A0]">RG-01: Gig-Worker Reclassification</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#3D52A0] text-white">Score: 15</span>
                    </div>
                    <span className="text-[#3D52A0]/80">Mitigation: True autonomous scheduling, voluntary micro-insurance, compliance.</span>
                  </div>

                  <div
                    onClick={() => setSelectedRisk(RISK_DATA.find((r) => r.id === 'MK-02') || null)}
                    className="p-3 rounded-2xl bg-[#EDE8F5]/60 border border-[#ADBBDA]/70 cursor-pointer hover:border-[#7091E6] transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[#3D52A0]">MK-02: Off-Platform Disintermediation</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#7091E6] text-white">Score: 12</span>
                    </div>
                    <span className="text-[#3D52A0]/80">Mitigation: 30-day warranty only applies if settled via in-app escrow.</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 text-[11px] text-[#8697C4] text-center border-t border-[#ADBBDA]/40">
                Click any risk tile to view mitigation actions, contingency plans & SLA triggers.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 6',
      title: 'ESG Performance & Quantitative Impact Dashboard',
      tagline: 'Translating sustainability commitments into quantitative, trackable ESG performance indicators',
      badge: 'ESG Metrics: GRI & SASB Aligned',
      content: (
        <div className="space-y-4 animate-fade-scale">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-4 shadow-foundation">
              <span className="text-[11px] font-bold text-[#7091E6] uppercase block mb-1">Environmental Pillar</span>
              <h6 className="font-bold text-[#3D52A0] text-sm mb-2">Transit Carbon Avoidance</h6>
              <div className="w-full bg-[#ADBBDA]/40 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-[#7091E6] h-2.5 rounded-full transition-all duration-1000" style={{ width: '74%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-[#8697C4]">
                <span>Current: 14.2 Tons</span>
                <span className="font-bold text-[#3D52A0]">Target Y1: 18.5 Tons</span>
              </div>
            </div>

            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-4 shadow-foundation">
              <span className="text-[11px] font-bold text-[#7091E6] uppercase block mb-1">Social Pillar</span>
              <h6 className="font-bold text-[#3D52A0] text-sm mb-2">Technician Hourly Wage Premium</h6>
              <div className="w-full bg-[#ADBBDA]/40 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-[#3D52A0] h-2.5 rounded-full transition-all duration-1000" style={{ width: '85%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-[#8697C4]">
                <span>Current: +24%</span>
                <span className="font-bold text-[#3D52A0]">Target Y1: +28%</span>
              </div>
            </div>

            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-gradient-to-b from-white to-[#EDE8F5]/60 p-4 shadow-foundation">
              <span className="text-[11px] font-bold text-[#7091E6] uppercase block mb-1">Governance Pillar</span>
              <h6 className="font-bold text-[#3D52A0] text-sm mb-2">KYC & Document Verification</h6>
              <div className="w-full bg-[#ADBBDA]/40 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-[#7091E6] h-2.5 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-[#8697C4]">
                <span>Current: 100%</span>
                <span className="font-bold text-[#3D52A0]">Target: 100% (Strict)</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-2">
              Corporate ESG & Sustainability Commitment Statement
            </h5>
            <p className="text-xs text-[#3D52A0]/90 leading-relaxed italic bg-[#EDE8F5]/40 p-4 rounded-2xl border border-[#ADBBDA]/60">
              "ProSolution is committed to building a climate-conscious, socially equitable services marketplace. By replacing the manual, high-emission brokerage model with hyperlocal smart routing, we cut vehicular Scope 3 emissions by over 30% per booking. Simultaneously, we elevate informal technicians into dignified, verified micro-entrepreneurs by passing 88% of transaction value directly to workers, enforcing safety standards, and ensuring 100% transparent algorithmic pricing without predatory lock-in."
            </p>
          </div>
        </div>
      ),
    },
    {
      domain: 'Pillar 7',
      title: 'Organizational Architecture & Human Capital Scaling (10 to 100+ Team)',
      tagline: 'Role-based hiring progression, functional specialization, and culture preservation mechanisms at scale',
      badge: 'Human Capital Roadmap',
      content: (
        <div className="space-y-4 animate-fade-scale">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-[#EDE8F5]/50 p-4 shadow-foundation">
              <span className="text-xs font-bold text-[#8697C4] block">Stage 1</span>
              <span className="text-xl font-black text-[#3D52A0]">10 Team</span>
              <span className="text-[11px] text-[#3D52A0]/80 block mt-1">Founders + Core Devs + Ops</span>
            </div>
            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-[#EDE8F5]/50 p-4 shadow-foundation">
              <span className="text-xs font-bold text-[#8697C4] block">Stage 2</span>
              <span className="text-xl font-black text-[#3D52A0]">25 Team</span>
              <span className="text-[11px] text-[#3D52A0]/80 block mt-1">Dedicated QA + Trust & Safety</span>
            </div>
            <div className="rounded-3xl border border-[#ADBBDA]/70 bg-[#EDE8F5]/50 p-4 shadow-foundation">
              <span className="text-xs font-bold text-[#8697C4] block">Stage 3</span>
              <span className="text-xl font-black text-[#3D52A0]">50 Team</span>
              <span className="text-[11px] text-[#3D52A0]/80 block mt-1">Regional Leads + Marketing</span>
            </div>
            <div className="rounded-3xl border border-[#7091E6]/50 bg-gradient-to-br from-[#EDE8F5] to-white p-4 shadow-foundation">
              <span className="text-xs font-bold text-[#7091E6] block">Stage 4</span>
              <span className="text-xl font-black text-[#3D52A0]">100+ Team</span>
              <span className="text-[11px] text-[#3D52A0] block mt-1 font-bold">VP Leadership + Specialists</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-5 shadow-foundation">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-3">
              The "ProSolution Culture Code" (Codified Operating Tenets)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-[#EDE8F5]/50 rounded-2xl border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">1. Provider Dignity</span>
                <span className="text-[#8697C4]">We treat tradespeople as skilled partners, not disposable gig headcount.</span>
              </div>
              <div className="p-3.5 bg-[#EDE8F5]/50 rounded-2xl border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">2. Transparent Honesty</span>
                <span className="text-[#8697C4]">Zero hidden fees, zero deceptive surge algorithms, zero fake reviews.</span>
              </div>
              <div className="p-3.5 bg-[#EDE8F5]/50 rounded-2xl border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">3. Frugal Engineering</span>
                <span className="text-[#8697C4]">Keep tech lean and serverless so savings flow back into provider wages.</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      domain: 'Platform Synthesis',
      title: 'Platform Architecture & Production Implementation Matrix',
      tagline: 'Direct architectural mapping between strategic venture principles and production Next.js source code',
      badge: 'Codebase Verification Matrix',
      content: (
        <div className="space-y-4 animate-fade-scale">
          <div className="overflow-x-auto rounded-3xl border border-[#ADBBDA]/60 shadow-foundation">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDE8F5] text-[#3D52A0] border-b border-[#ADBBDA]/60">
                  <th className="p-3.5 font-bold">Strategic Pillar</th>
                  <th className="p-3.5 font-bold">Core Business Capability</th>
                  <th className="p-3.5 font-bold">System Module / Codebase Path</th>
                  <th className="p-3.5 font-bold">Live Production Capability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ADBBDA]/30 bg-white">
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 1: Sustainability Diagnostic</td>
                  <td className="p-3 text-[#8697C4]">Triple Bottom Line & Fair Trade</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/lib/rules.ts</td>
                  <td className="p-3 text-[#3D52A0]/90">Automated transparent quotations and fair cancellation policies.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 2: Scalable BMC</td>
                  <td className="p-3 text-[#8697C4]">Automation & Platform Decoupling</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/app/customer/requests/new</td>
                  <td className="p-3 text-[#3D52A0]/90">FairQuote wizard matches customer requests to provider feeds automatically.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 3: Operations & Logistics</td>
                  <td className="p-3 text-[#8697C4]">Digital WorkProof & QA Verification</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/app/provider/work-photos</td>
                  <td className="p-3 text-[#3D52A0]/90">Before & After photo proof ensures quality without manual inspectors.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 4: Financial Model</td>
                  <td className="p-3 text-[#8697C4]">Unit Economics & Payout Ledgers</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/app/provider/earnings</td>
                  <td className="p-3 text-[#3D52A0]/90">Dynamic 88% / 12% split calculation and transparent income tracking.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 5: Risk Governance</td>
                  <td className="p-3 text-[#8697C4]">Dispute Resolution & KYC Gate</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/app/admin/verification & complaints</td>
                  <td className="p-3 text-[#3D52A0]/90">Mandatory document review & formal complaint SLA handling.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 6: ESG Integration</td>
                  <td className="p-3 text-[#8697C4]">Governance & Trust Metrics</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/app/admin/reviews</td>
                  <td className="p-3 text-[#3D52A0]/90">Audit logs and community trust scoring preventing review manipulation.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#3D52A0]">Pillar 7: Human Capital</td>
                  <td className="p-3 text-[#8697C4]">Role-Based Access Control (RBAC)</td>
                  <td className="p-3 font-mono text-[#7091E6] font-semibold">src/lib/auth.ts</td>
                  <td className="p-3 text-[#3D52A0]/90">Role guards for Customer, Provider, and Admin users enabling team scaling.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#3D52A0] via-[#7091E6] to-[#8697C4] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-foundation">
            <div>
              <h5 className="font-black text-base">Explore the live marketplace platform</h5>
              <p className="text-xs text-white/90">Test job postings, compare FairQuote bids, and inspect provider verification workflows.</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-2xl bg-white text-[#3D52A0] font-bold text-xs hover:bg-[#EDE8F5] transition shadow-xs"
              >
                Sign In to Platform
              </Link>
              <button
                onClick={() => setViewMode('doc')}
                className="px-5 py-2.5 rounded-2xl bg-[#3D52A0]/60 border border-white/30 text-white font-bold text-xs hover:bg-[#3D52A0] transition"
              >
                View Detailed Blueprint
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={`min-h-screen pb-16 bg-[#F6F4FA] text-[#1E2749] ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-white p-4' : ''}`}>
      {/* Top Banner & Mode Switcher */}
      <div className="bg-gradient-to-b from-[#3D52A0] via-[#3D52A0] to-[#2B3A73] text-white px-4 py-8 sm:py-12 border-b border-[#7091E6]/30">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ADBBDA]/30 bg-white/10 px-3.5 py-1 text-xs font-semibold text-[#EDE8F5] mb-3 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-[#7091E6]" />
                Strategic Venture Architecture & Scalability Blueprint
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                About ProSolution
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#EDE8F5]/90 max-w-3xl leading-relaxed">
                Comprehensive strategic diagnostic and enterprise architecture detailing how ProSolution delivers sustainability, unit economics, risk governance, and scalable operations.
              </p>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center gap-2 shrink-0 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
              <button
                onClick={() => setViewMode('slides')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  viewMode === 'slides'
                    ? 'bg-white text-[#3D52A0] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Presentation className="h-4 w-4" />
                <span>Executive Deck</span>
              </button>
              <button
                onClick={() => setViewMode('doc')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  viewMode === 'doc'
                    ? 'bg-white text-[#3D52A0] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Strategic Blueprint</span>
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle Fullscreen"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white transition border-l border-white/20 ml-1"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => window.print()}
                title="Print or Save as PDF"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white transition border-l border-white/20 ml-1"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            </div>
          </div>

          {/* Quick jump tabs in doc mode */}
          {viewMode === 'doc' && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar border-t border-white/15">
              {[
                { id: 1, label: 'Pillar 1: Sustainability Diagnostic', icon: Leaf },
                { id: 2, label: 'Pillar 2: Scalable BMC', icon: Layers },
                { id: 3, label: 'Pillar 3: Operations & Logistics', icon: Truck },
                { id: 4, label: 'Pillar 4: Financial Model', icon: TrendingUp },
                { id: 5, label: 'Pillar 5: Risk Governance', icon: AlertTriangle },
                { id: 6, label: 'Pillar 6: ESG Dashboard', icon: Award },
                { id: 7, label: 'Pillar 7: Human Capital', icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'bg-white text-[#3D52A0] shadow-xs'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {viewMode === 'slides' ? (
          /* PRESENTATION DECK MODE */
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-10 shadow-foundation">
              {/* Slide Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ADBBDA]/40 pb-5 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] border border-[#ADBBDA] px-3 py-0.5 rounded-full">
                      {slides[currentSlide].domain}
                    </span>
                    <span className="text-xs font-semibold text-[#8697C4]">
                      {slides[currentSlide].badge}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#3D52A0] tracking-tight">
                    {slides[currentSlide].title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8697C4] mt-1">
                    {slides[currentSlide].tagline}
                  </p>
                </div>
                <div className="text-xs font-bold text-[#8697C4] shrink-0 self-end sm:self-center">
                  Slide {currentSlide + 1} of {slides.length}
                </div>
              </div>

              {/* Slide Content */}
              <div className="min-h-[380px] flex flex-col justify-center">
                {slides[currentSlide].content}
              </div>

              {/* Slide Controls */}
              <div className="flex items-center justify-between border-t border-[#ADBBDA]/40 pt-5 mt-6">
                <button
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold border border-[#ADBBDA] text-[#3D52A0] hover:bg-[#EDE8F5] transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {/* Dots indicator */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'w-8 bg-[#3D52A0]' : 'w-2 bg-[#ADBBDA] hover:bg-[#8697C4]'
                      }`}
                      title={`Jump to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-[#3D52A0] text-white hover:bg-[#2B3A73] transition disabled:opacity-40 disabled:pointer-events-none shadow-xs"
                >
                  <span>Next Slide</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Slide Navigation Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {slides.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 ${
                    currentSlide === idx
                      ? 'border-[#3D52A0] bg-[#EDE8F5] shadow-xs ring-2 ring-[#7091E6]/30'
                      : 'border-[#ADBBDA]/60 bg-white hover:border-[#8697C4]'
                  }`}
                >
                  <span className="text-[10px] font-bold text-[#7091E6] block">{s.domain}</span>
                  <span className="text-[11px] font-bold text-[#3D52A0] line-clamp-1 block mt-0.5">
                    {s.title.split(':')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* STRATEGIC BLUEPRINT TABBED VIEW */
          <div className="space-y-8">
            {/* PILLAR 1 */}
            {activeTab === 1 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <div className="flex items-center justify-between border-b border-[#ADBBDA]/40 pb-4 mb-5">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                        Strategic Pillar 1
                      </span>
                      <h2 className="text-2xl font-black text-[#3D52A0] mt-2">
                        Sustainability & Impact Architecture
                      </h2>
                      <p className="text-sm text-[#8697C4] mt-1">
                        Comprehensive diagnostic under the Triple Bottom Line (People, Planet, Profit) framework.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-[#3D52A0]">{overallAuditScore} / 5.0</div>
                      <div className="text-[11px] font-semibold text-[#8697C4] uppercase">Composite Index</div>
                    </div>
                  </div>

                  {/* Interactive Assessment */}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8697C4] mb-3">
                    Interactive Sustainability & Operational Diagnostic
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Environmental */}
                    <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/30 p-5 shadow-foundation">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-[#3D52A0] flex items-center gap-1.5 text-sm">
                          <Leaf className="h-4 w-4 text-[#7091E6]" /> Environmental
                        </span>
                        <span className="text-xs font-bold bg-[#EDE8F5] text-[#3D52A0] px-2.5 py-0.5 rounded-full border border-[#ADBBDA]">
                          Avg: {avgEnv}
                        </span>
                      </div>
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Route & Transit Energy:</span>
                            <span className="font-bold">{auditScores.env1}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.env1}
                            onChange={(e) => setAuditScores({ ...auditScores, env1: Number(e.target.value) })}
                            className="w-full accent-[#3D52A0]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: 5km radius matching cuts emissions 34%.</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Paperless Operations:</span>
                            <span className="font-bold">{auditScores.env2}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.env2}
                            onChange={(e) => setAuditScores({ ...auditScores, env2: Number(e.target.value) })}
                            className="w-full accent-[#3D52A0]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: 100% digital quotes & WorkProof photos.</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Scrap Recycling:</span>
                            <span className="font-bold">{auditScores.env3}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.env3}
                            onChange={(e) => setAuditScores({ ...auditScores, env3: Number(e.target.value) })}
                            className="w-full accent-[#3D52A0]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: Guidelines for copper pipe & PCB recovery.</p>
                        </div>
                      </div>
                    </div>

                    {/* Social */}
                    <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/30 p-5 shadow-foundation">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-[#3D52A0] flex items-center gap-1.5 text-sm">
                          <HeartHandshake className="h-4 w-4 text-[#7091E6]" /> Social
                        </span>
                        <span className="text-xs font-bold bg-[#EDE8F5] text-[#3D52A0] px-2.5 py-0.5 rounded-full border border-[#ADBBDA]">
                          Avg: {avgSoc}
                        </span>
                      </div>
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Fair Wages & Take-rate:</span>
                            <span className="font-bold">{auditScores.soc1}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.soc1}
                            onChange={(e) => setAuditScores({ ...auditScores, soc1: Number(e.target.value) })}
                            className="w-full accent-[#7091E6]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: Technicians retain 88% of quote value.</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Vetted Worker Safety:</span>
                            <span className="font-bold">{auditScores.soc2}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.soc2}
                            onChange={(e) => setAuditScores({ ...auditScores, soc2: Number(e.target.value) })}
                            className="w-full accent-[#7091E6]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: Admin verification before account activation.</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Inclusive Livelihoods:</span>
                            <span className="font-bold">{auditScores.soc3}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.soc3}
                            onChange={(e) => setAuditScores({ ...auditScores, soc3: Number(e.target.value) })}
                            className="w-full accent-[#7091E6]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: Open onboarding for informal trade pros.</p>
                        </div>
                      </div>
                    </div>

                    {/* Economic */}
                    <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/30 p-5 shadow-foundation">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-[#3D52A0] flex items-center gap-1.5 text-sm">
                          <DollarSign className="h-4 w-4 text-[#7091E6]" /> Economic
                        </span>
                        <span className="text-xs font-bold bg-[#EDE8F5] text-[#3D52A0] px-2.5 py-0.5 rounded-full border border-[#ADBBDA]">
                          Avg: {avgEco}
                        </span>
                      </div>
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Unit Margins & Resilience:</span>
                            <span className="font-bold">{auditScores.eco1}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.eco1}
                            onChange={(e) => setAuditScores({ ...auditScores, eco1: Number(e.target.value) })}
                            className="w-full accent-[#3D52A0]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: 73.3% contribution margin per job.</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Cost Structure Scalability:</span>
                            <span className="font-bold">{auditScores.eco2}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.eco2}
                            onChange={(e) => setAuditScores({ ...auditScores, eco2: Number(e.target.value) })}
                            className="w-full accent-[#3D52A0]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: Serverless Neon DB scales dynamically with zero fixed servers.</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-[#3D52A0] font-medium mb-1">
                            <span>Fair Market Pricing:</span>
                            <span className="font-bold">{auditScores.eco3}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={auditScores.eco3}
                            onChange={(e) => setAuditScores({ ...auditScores, eco3: Number(e.target.value) })}
                            className="w-full accent-[#3D52A0]"
                          />
                          <p className="text-[10px] text-[#8697C4] mt-0.5">Evidence: FairQuote rules stop monopolistic price surges.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="rounded-3xl border border-[#ADBBDA]/60 bg-[#EDE8F5]/40 p-5 shadow-foundation">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] mb-2">
                      Strategic Diagnostic Summary
                    </h5>
                    <p className="text-xs text-[#3D52A0]/90 leading-relaxed">
                      ProSolution transforms fragmented urban home repairs into an environmentally sustainable, socially inclusive, and economically self-sustaining digital ecosystem. Operating on a clean 12% take-rate, the venture preserves technician dignity while eliminating the exploitative middleman fees that characterize traditional contractor agencies. By localizing dispatch through algorithmic clustering, the platform achieves substantial Scope 3 emissions reductions while ensuring zero paper consumption through verified digital WorkProof.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* PILLARS 2 TO 7 */}
            {activeTab === 2 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                    Strategic Pillar 2
                  </span>
                  <h2 className="text-2xl font-black text-[#3D52A0] mt-2 mb-4">
                    Scalable Business Model Architecture
                  </h2>
                  {slides[2].content}
                </div>
              </section>
            )}

            {activeTab === 3 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                    Strategic Pillar 3
                  </span>
                  <h2 className="text-2xl font-black text-[#3D52A0] mt-2 mb-4">
                    Operations & Circular Logistics
                  </h2>
                  {slides[3].content}
                </div>
              </section>
            )}

            {activeTab === 4 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                    Strategic Pillar 4
                  </span>
                  <h2 className="text-2xl font-black text-[#3D52A0] mt-2 mb-4">
                    Unit Economics & Financial Modeling
                  </h2>
                  {slides[4].content}
                </div>
              </section>
            )}

            {activeTab === 5 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                    Strategic Pillar 5
                  </span>
                  <h2 className="text-2xl font-black text-[#3D52A0] mt-2 mb-4">
                    Enterprise Risk Governance
                  </h2>
                  {slides[5].content}
                </div>
              </section>
            )}

            {activeTab === 6 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                    Strategic Pillar 6
                  </span>
                  <h2 className="text-2xl font-black text-[#3D52A0] mt-2 mb-4">
                    ESG Impact Dashboard
                  </h2>
                  {slides[6].content}
                </div>
              </section>
            )}

            {activeTab === 7 && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-[#ADBBDA]/60 bg-white p-6 sm:p-8 shadow-foundation">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3D52A0] bg-[#EDE8F5] px-3 py-1 rounded-full border border-[#ADBBDA]">
                    Strategic Pillar 7
                  </span>
                  <h2 className="text-2xl font-black text-[#3D52A0] mt-2 mb-4">
                    Organizational Architecture
                  </h2>
                  {slides[7].content}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Slide-out Risk Detail Modal */}
      {selectedRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2749]/40 backdrop-blur-sm p-4 animate-fade-scale">
          <div className="w-full max-w-lg rounded-3xl border border-[#ADBBDA] bg-white p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedRisk(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#8697C4] hover:text-[#3D52A0] hover:bg-[#EDE8F5] transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#EDE8F5] text-[#3D52A0] border border-[#ADBBDA]">
                {selectedRisk.id}
              </span>
              <span className="text-xs font-semibold text-[#8697C4]">{selectedRisk.category} Risk</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#3D52A0] text-white ml-auto mr-8">
                Score: {selectedRisk.score} (P{selectedRisk.p} × I{selectedRisk.i})
              </span>
            </div>

            <h3 className="text-base font-bold text-[#3D52A0] mb-4 pr-6">
              {selectedRisk.title}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#EDE8F5]/60 border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">Proactive Mitigation (Reduces Likelihood):</span>
                <span className="text-[#3D52A0]/90">{selectedRisk.mitigation}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EDE8F5]/60 border border-[#ADBBDA]/60">
                <span className="font-bold text-[#3D52A0] block mb-1">Reactive Contingency (Reduces Impact):</span>
                <span className="text-[#3D52A0]/90">{selectedRisk.contingency}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                <span className="font-bold text-amber-900 block mb-1">Early-Warning Trigger Metric:</span>
                <span className="text-amber-800">{selectedRisk.trigger}</span>
              </div>
              <div className="flex justify-between items-center text-[#8697C4] pt-1">
                <span>Governance Owner: <strong>{selectedRisk.owner}</strong></span>
                <span>Review Cadence: <strong>Bi-Weekly</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
