import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Medal, Building2, MapPin, RefreshCw } from "lucide-react";
import { useCompetition } from "./CompetitionHook";

export default function RankingsView() {
  const { t } = useTranslation();
  const { rankings, loadRankings, comp } = useCompetition();
  const [activeTab, setActiveTab] = useState<"categories" | "clubs" | "wilayas">("categories");

  if (!rankings) {
    return (
      <div className="card-elevated p-8 text-center">
        <Trophy size={40} className="mx-auto mb-3 text-ink-faint opacity-50" />
        <h3 className="text-base font-semibold text-ink">
          {t("rankings.emptyTitle", "Classements non disponibles")}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {t("rankings.emptyDesc", "Démarrez la compétition et enregistrez des résultats pour générer les classements.")}
        </p>
        <button
          onClick={() => loadRankings()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-bg-subtle transition-colors"
        >
          <RefreshCw size={14} />
          {t("common.refresh", "Actualiser")}
        </button>
      </div>
    );
  }

  const { categories, clubs, wilayas, pointsConfig } = rankings;

  return (
    <div className="space-y-6">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Trophy size={20} className="text-primary" />
            {t("rankings.title", "Classements & Podiums")}
          </h2>
          <p className="text-xs text-ink-muted">
            {t("rankings.pointsRule", "Attribution des points")} : {pointsConfig.gold} pts (Or), {pointsConfig.silver} pts (Argent), {pointsConfig.bronze} pt (Bronze)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-bg-subtle p-1">
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "categories"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Medal size={14} />
              {t("rankings.categories", "Podiums par Catégorie")}
            </button>

            {comp?.clubRankingEnabled && (
              <button
                onClick={() => setActiveTab("clubs")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "clubs"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Building2 size={14} />
                {t("rankings.clubs", "Classement Clubs")}
              </button>
            )}

            {comp?.wilayaRankingEnabled && (
              <button
                onClick={() => setActiveTab("wilayas")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "wilayas"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <MapPin size={14} />
                {t("rankings.wilayas", "Classement Wilayas")}
              </button>
            )}
          </div>

          <button
            onClick={() => loadRankings()}
            title={t("common.refresh", "Actualiser")}
            className="rounded-lg border border-border bg-surface p-2 text-ink-muted hover:text-ink transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* TAB 1: Category Podiums */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div key={cat.categoryId} className="card-elevated p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <h3 className="text-sm font-bold text-ink">{cat.categoryName}</h3>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {cat.gender === "M" ? "Masculin" : "Féminin"}
                  </span>
                </div>

                {cat.podium.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-muted">
                    {t("rankings.noResultsYet", "Aucun match terminé dans cette catégorie")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cat.podium.map((p) => {
                      const medalConfig =
                        p.medal === "gold"
                          ? { icon: "🥇", label: "Or", bg: "bg-amber-500/10 text-amber-500 border-amber-500/30" }
                          : p.medal === "silver"
                          ? { icon: "🥈", label: "Argent", bg: "bg-slate-400/10 text-slate-300 border-slate-400/30" }
                          : p.medal === "bronze"
                          ? { icon: "🥉", label: "Bronze", bg: "bg-amber-700/10 text-amber-600 border-amber-700/30" }
                          : { icon: "4e", label: "4e", bg: "bg-bg-subtle text-ink-muted border-border" };

                      return (
                        <div
                          key={p.registrationId}
                          className={`flex items-center justify-between rounded-lg border p-2.5 ${medalConfig.bg}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold">{medalConfig.icon}</span>
                            <div>
                              <div className="text-sm font-semibold text-ink">{p.athleteName}</div>
                              <div className="text-xs text-ink-muted">
                                {p.clubName ?? "—"} {p.wilayaName ? `(${p.wilayaName})` : ""}
                              </div>
                            </div>
                          </div>
                          {p.points > 0 && (
                            <span className="text-xs font-bold text-ink-muted">
                              +{p.points} pts
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Club Rankings Table */}
      {activeTab === "clubs" && (
        <div className="card-elevated overflow-hidden">
          <div className="border-b border-border px-6 py-4 bg-bg-subtle flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">
              {t("rankings.clubStandings", "Tableau d'Honneur des Clubs")}
            </h3>
            <span className="text-xs text-ink-muted">{clubs.length} clubs participants</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="border-b border-border bg-surface text-xs font-semibold uppercase text-ink-muted">
                <tr>
                  <th className="px-6 py-3 text-center w-16">Rang</th>
                  <th className="px-6 py-3">Club</th>
                  <th className="px-6 py-3">Wilaya</th>
                  <th className="px-6 py-3 text-center">🥇 Or</th>
                  <th className="px-6 py-3 text-center">🥈 Argent</th>
                  <th className="px-6 py-3 text-center">🥉 Bronze</th>
                  <th className="px-6 py-3 text-center">Athlètes</th>
                  <th className="px-6 py-3 text-right font-bold text-primary">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clubs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-xs text-ink-muted">
                      {t("rankings.noClubsYet", "Aucun résultat enregistré")}
                    </td>
                  </tr>
                ) : (
                  clubs.map((c) => (
                    <tr key={c.clubId} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="px-6 py-4 text-center font-bold">
                        {c.rank === 1 ? "🥇 1" : c.rank === 2 ? "🥈 2" : c.rank === 3 ? "🥉 3" : c.rank}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">{c.clubName}</td>
                      <td className="px-6 py-4 text-xs text-ink-muted">{c.wilayaName ?? "—"}</td>
                      <td className="px-6 py-4 text-center font-semibold text-amber-500">{c.gold}</td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-300">{c.silver}</td>
                      <td className="px-6 py-4 text-center font-semibold text-amber-600">{c.bronze}</td>
                      <td className="px-6 py-4 text-center text-xs text-ink-muted">{c.athleteCount}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-base text-primary">{c.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Wilaya Rankings Table */}
      {activeTab === "wilayas" && (
        <div className="card-elevated overflow-hidden">
          <div className="border-b border-border px-6 py-4 bg-bg-subtle flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">
              {t("rankings.wilayaStandings", "Classement Général par Wilaya")}
            </h3>
            <span className="text-xs text-ink-muted">{wilayas.length} wilayas représentées</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="border-b border-border bg-surface text-xs font-semibold uppercase text-ink-muted">
                <tr>
                  <th className="px-6 py-3 text-center w-16">Rang</th>
                  <th className="px-6 py-3">Wilaya</th>
                  <th className="px-6 py-3 text-center">🥇 Or</th>
                  <th className="px-6 py-3 text-center">🥈 Argent</th>
                  <th className="px-6 py-3 text-center">🥉 Bronze</th>
                  <th className="px-6 py-3 text-center">Clubs</th>
                  <th className="px-6 py-3 text-right font-bold text-primary">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wilayas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-ink-muted">
                      {t("rankings.noWilayasYet", "Aucun résultat enregistré")}
                    </td>
                  </tr>
                ) : (
                  wilayas.map((w) => (
                    <tr key={w.wilayaId} className="hover:bg-bg-subtle/50 transition-colors">
                      <td className="px-6 py-4 text-center font-bold">
                        {w.rank === 1 ? "🥇 1" : w.rank === 2 ? "🥈 2" : w.rank === 3 ? "🥉 3" : w.rank}
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink">{w.wilayaName}</td>
                      <td className="px-6 py-4 text-center font-semibold text-amber-500">{w.gold}</td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-300">{w.silver}</td>
                      <td className="px-6 py-4 text-center font-semibold text-amber-600">{w.bronze}</td>
                      <td className="px-6 py-4 text-center text-xs text-ink-muted">{w.clubCount}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-base text-primary">{w.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
