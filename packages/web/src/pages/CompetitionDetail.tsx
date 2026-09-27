import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play, Pause, Zap, Swords, Flag, Trophy, FileText, Share2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { CompetitionProvider, useCompetition } from "../components/competition/CompetitionHook";
import OverviewView from "../components/competition/OverviewView";
import RegistrationsView from "../components/competition/RegistrationsView";
import DrawView from "../components/competition/DrawView";
import RankingsView from "../components/competition/RankingsView";
import DocumentsView from "../components/competition/DocumentsView";
import ToastContainer from "../components/competition/ToastContainer";
import ShareLinksModal from "../components/competition/ShareLinksModal";
import { STATUS_LABEL } from "../utils/statusLabels";

type ViewTab = "overview" | "registrations" | "draw" | "rankings" | "documents";

function CompetitionContent() {
  const { t } = useTranslation();
  const { comp, loading, toasts, dismissToast, transition, resolveAll, generateDraw, drawLoading, isOpen, isDraft, isClosed, isDrawGenerated, isDrawConfirmed, isInProgress, isCompleted, regCount } = useCompetition();
  const [activeView, setActiveView] = useState<ViewTab>("overview");
  const [shareOpen, setShareOpen] = useState(false);

  if (loading) return <div className="card-elevated py-16 text-center text-sm text-ink-muted">{t("common.loading")}</div>;
  if (!comp) return <div className="card-elevated py-16 text-center text-sm text-danger">Not found</div>;

  const showDrawTab = isDrawGenerated || isDrawConfirmed || isInProgress || isCompleted;
  const showRankingsTab = isInProgress || isCompleted;

  const tabs: Array<{ key: ViewTab; label: string; icon: typeof Swords; show: boolean }> = [
    { key: "overview", label: t("competitions.lifecycle", "Progression"), icon: Swords, show: true },
    { key: "registrations", label: `${t("competitions.registrations")} (${regCount})`, icon: Zap, show: true },
    { key: "draw", label: t("competitions.bracket", "Tableau"), icon: Swords, show: showDrawTab },
    { key: "rankings", label: t("rankings.tabTitle", "Classements & Podiums"), icon: Trophy, show: showRankingsTab },
    { key: "documents", label: t("documents.tabTitle", "Documents"), icon: FileText, show: true },
  ];

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ShareLinksModal
        competitionId={comp.id}
        competitionName={comp.name}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <div className="mb-4">
        <Link to="/competitions" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} /> {t("competitions.title")}
        </Link>
      </div>

      <PageHeader
        title={comp.name}
        subtitle={`${comp.templateName ?? ""} · ${new Date(comp.date).toLocaleDateString("fr-FR")}${comp.location ? " · " + comp.location : ""}`}
        extra={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg-subtle transition-colors cursor-pointer shadow-xs"
              title="Partager le lien public et générer des liens de ligues"
            >
              <Share2 size={14} className="text-primary" />
              <span>Partager / Ligues</span>
            </button>

            <StatusBadge
              label={STATUS_LABEL[comp.status] ?? comp.status}
              tone={comp.status === "COMPLETED" ? "success" : comp.status === "IN_PROGRESS" ? "warning" : comp.status === "REGISTRATION_OPEN" ? "success" : comp.status === "REGISTRATION_CLOSED" ? "warning" : comp.status.startsWith("DRAW") ? "info" : "default"}
            />
            {isDraft && (
              <button onClick={() => transition("open-registration")} className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
                <Play size={14} /> {t("competitions.openRegistration")}
              </button>
            )}
            {isOpen && (
              <button onClick={() => transition("close-registration")} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors">
                <Pause size={14} /> {t("competitions.closeRegistration")}
              </button>
            )}
            {isClosed && (
              <>
                <button onClick={() => transition("reopen-registration")} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors">
                  {t("competitions.reopenRegistration")}
                </button>
                <button onClick={resolveAll} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg-subtle transition-colors">
                  <Zap size={14} /> {t("competitions.resolve")}
                </button>
                <button onClick={generateDraw} disabled={drawLoading || (comp?.unresolvedCount ?? 0) > 0}
                  className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60">
                  <Swords size={14} /> {drawLoading ? t("common.loading") : t("competitions.generateDraw", "Générer le tableau")}
                </button>
              </>
            )}
            {isDrawConfirmed && (
              <button onClick={() => transition("start")} className="brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all">
                <Play size={14} /> {t("competitions.start", "Commencer")}
              </button>
            )}
            {isInProgress && (
              <button onClick={() => transition("complete")} className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/8 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/15 transition-colors">
                <Trophy size={14} /> {t("competitions.complete", "Terminer")}
              </button>
            )}
          </div>
        }
      />

      {/* ── View Tabs ──────────────────────────────────────────────────── */}
      <div className="mb-5 flex gap-1 rounded-xl bg-bg-subtle p-1">
        {tabs.filter((tab) => tab.show).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeView === tab.key
                ? "bg-surface text-ink shadow-sm ring-1 ring-border"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Active View ────────────────────────────────────────────────── */}
      {activeView === "overview" && <OverviewView />}
      {activeView === "registrations" && <RegistrationsView />}
      {activeView === "draw" && <DrawView />}
      {activeView === "rankings" && <RankingsView />}
      {activeView === "documents" && <DocumentsView competitionId={comp.id} />}
    </div>
  );
}

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompetitionProvider id={id}>
      <CompetitionContent />
    </CompetitionProvider>
  );
}
