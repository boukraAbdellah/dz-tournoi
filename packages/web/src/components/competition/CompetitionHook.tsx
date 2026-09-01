import { useEffect, useMemo, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { api } from "../../api";
import { useConfirm } from "../common/ConfirmDialog";
import type {
  CompetitionDetail,
  Reg,
  Resolution,
  Toast,
  BracketData,
  BracketMatch,
  Athlete,
  Club,
  CompetitionRankingsResult,
} from "./types";

interface CompetitionContextValue {
  id: string | undefined;
  comp: CompetitionDetail | null;
  registrations: Reg[];
  resolution: Resolution | null;
  athletes: Athlete[];
  clubs: Club[];
  loading: boolean;
  brackets: Record<number, BracketData>;
  selectedCatId: number | null;
  setSelectedCatId: (id: number | null) => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
  load: () => void;
  loadResolution: () => void;
  loadBracket: (catId: number) => void;
  loadRankings: () => Promise<void>;
  rankings: CompetitionRankingsResult | null;
  generateDraw: () => Promise<void>;
  generateCategoryDraw: (catId: number) => Promise<void>;
  lockDraw: () => Promise<void>;
  enterResult: (matchId: number, scoreA: number, scoreB: number, resultType: string, winnerRegistrationId?: number | null) => Promise<void>;
  swapAthletes: (matchIdA: number, matchIdB: number) => Promise<void>;
  swapSpecificAthletes: (regIdA: number, regIdB: number) => Promise<void>;
  moveAthlete: (regId: number, targetOrdinal: number, targetSide: "A" | "B") => Promise<void>;
  transition: (action: string) => Promise<void>;
  toggleCategory: (catId: number, enabled: boolean) => Promise<void>;
  batchToggle: (enabled: boolean, filter: { gender?: string; ageCategoryId?: number }) => Promise<void>;
  registerExisting: (form: Record<string, string>) => Promise<void>;
  registerInline: (form: Record<string, string>) => Promise<void>;
  loadBulkPreview: (catId: string) => Promise<void>;
  bulkPreview: {
    athletes: Array<{ id: number; firstName: string; lastName: string; weightKg: number | null; clubName: string | null }>;
    total: number;
    categoryName: string;
  } | null;
  executeBulkRegister: (catId: string) => Promise<void>;
  bulkLoading: boolean;
  withdraw: (regId: number) => Promise<void>;
  resolveAll: () => Promise<void>;
  updateWeight: (regId: number, value: string) => Promise<void>;
  updateCategory: (regId: number, gender: string, ageCategoryId: string, weightDivisionId: string) => Promise<void>;
  drawLoading: boolean;
  isOpen: boolean;
  isDraft: boolean;
  isClosed: boolean;
  isDrawGenerated: boolean;
  isDrawConfirmed: boolean;
  isInProgress: boolean;
  isCompleted: boolean;
  regCount: number;
  enabledCategories: CompetitionDetail["categories"];
}

const CompetitionContext = createContext<CompetitionContextValue | null>(null);

export function useCompetition() {
  const ctx = useContext(CompetitionContext);
  if (!ctx) throw new Error("useCompetition must be used within CompetitionProvider");
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────

function ageAtDate(birthDate: string, compDate: string): number {
  const birth = new Date(birthDate);
  const comp = new Date(compDate);
  let age = comp.getFullYear() - birth.getFullYear();
  const m = comp.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && comp.getDate() < birth.getDate())) age--;
  return age;
}

export function findMatchingCategory(
  categories: CompetitionDetail["categories"],
  gender: string,
  age: number,
  weightKg: number | null,
): number | null {
  for (const cat of categories) {
    if (!cat.enabled) continue;
    if (cat.gender !== gender) continue;
    if (age < cat.minAge) continue;
    if (cat.maxAge != null && age > cat.maxAge) continue;
    if (weightKg == null) continue;
    if (cat.minKg != null && weightKg < cat.minKg) continue;
    if (cat.maxKg != null && weightKg > cat.maxKg) continue;
    return cat.id;
  }
  return null;
}

export function catName(
  categories: CompetitionDetail["categories"],
  catId: number | null,
): string | null {
  if (!catId) return null;
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return null;
  return `${cat.ageCategoryName} · ${cat.weightDivisionName} (${cat.gender})`;
}

export function weightLabel(minKg: number | null, maxKg: number | null): string {
  if (minKg != null && maxKg != null) return `${minKg}–${maxKg} kg`;
  if (maxKg != null) return `-${maxKg} kg`;
  if (minKg != null) return `+${minKg} kg`;
  return "—";
}

// ── Provider ──────────────────────────────────────────────────────────

export function CompetitionProvider({ id, children }: { id: string | undefined; children: ReactNode }) {
  const [comp, setComp] = useState<CompetitionDetail | null>(null);
  const [registrations, setRegistrations] = useState<Reg[]>([]);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [brackets, setBrackets] = useState<Record<number, BracketData>>({});
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [rankings, setRankings] = useState<CompetitionRankingsResult | null>(null);
  const [bulkPreview, setBulkPreview] = useState<{
    athletes: Array<{ id: number; firstName: string; lastName: string; weightKg: number | null; clubName: string | null }>;
    total: number;
    categoryName: string;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Toasts ────────────────────────────────────────────────────────────

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const toastId = Date.now();
      setToasts((prev) => [...prev, { id: toastId, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3500);
    },
    [],
  );

  const dismissToast = useCallback((toastId: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────

  const load = useCallback(() => {
    if (!id) return;
    api
      .get<CompetitionDetail>(`/competitions/${id}`)
      .then(setComp)
      .catch(console.error)
      .finally(() => setLoading(false));
    api
      .get<Reg[]>(`/competitions/${id}/registrations`)
      .then(setRegistrations)
      .catch(console.error);
  }, [id]);

  const loadResolution = useCallback(() => {
    if (!id) return;
    api
      .get<Resolution>(`/competitions/${id}/resolution`)
      .then(setResolution)
      .catch(console.error);
  }, [id]);

  const loadRankings = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<CompetitionRankingsResult>(`/competitions/${id}/rankings`);
      setRankings(data);
    } catch {
      // Rankings may not be ready
    }
  }, [id]);

  const loadBracket = useCallback(
    async (catId: number) => {
      if (!id) return;
      try {
        const data = await api.get<BracketData>(`/competitions/${id}/bracket/${catId}`);
        setBrackets((prev) => ({ ...prev, [catId]: data }));
      } catch {
        // Bracket may not exist yet
      }
    },
    [id],
  );

  useEffect(() => {
    load();
    api.get<Athlete[]>("/athletes").then(setAthletes).catch(console.error);
    api.get<Club[]>("/clubs").then(setClubs).catch(console.error);
  }, [id, load]);

  useEffect(() => {
    if (comp && comp.status !== "DRAFT" && comp.status !== "REGISTRATION_OPEN") {
      loadResolution();
    }
    if (comp && (comp.status === "DRAW_GENERATED" || comp.status === "DRAW_CONFIRMED" || comp.status === "IN_PROGRESS" || comp.status === "COMPLETED")) {
      const enabledCats = comp.categories.filter((c) => c.enabled);
      for (const cat of enabledCats) {
        loadBracket(cat.id);
      }
      if (!selectedCatId && enabledCats.length > 0 && enabledCats[0]) {
        setSelectedCatId(enabledCats[0].id);
      }
      if (comp.status === "IN_PROGRESS" || comp.status === "COMPLETED") {
        loadRankings();
      }
    }
  }, [comp?.status, loadResolution, loadRankings]);

  // ── Status helpers ────────────────────────────────────────────────────

  const isOpen = comp?.status === "REGISTRATION_OPEN";
  const isDraft = comp?.status === "DRAFT";
  const isClosed = comp?.status === "REGISTRATION_CLOSED";
  const isDrawGenerated = comp?.status === "DRAW_GENERATED";
  const isDrawConfirmed = comp?.status === "DRAW_CONFIRMED";
  const isInProgress = comp?.status === "IN_PROGRESS";
  const isCompleted = comp?.status === "COMPLETED";
  const regCount = registrations.filter((r) => r.status === "REGISTERED").length;
  const enabledCategories = comp?.categories.filter((c) => c.enabled) ?? [];
  const confirm = useConfirm();

  // ── Draw actions ─────────────────────────────────────────────────────

  const generateDraw = async () => {
    if (!id) return;
    const ok = await confirm({
      title: "Régénérer tout le tournoi",
      message: "Êtes-vous sûr de vouloir régénérer le tableau de toutes les catégories ? Les tableaux actuels non confirmés seront remplacés.",
      confirmLabel: "Régénérer tout",
      cancelLabel: "Annuler",
      variant: "warning",
    });
    if (!ok) return;
    setDrawLoading(true);
    try {
      const result = await api.post<{ ok: boolean; categoriesProcessed: number; totalMatches: number }>(
        `/competitions/${id}/generate-draw`,
      );
      load();
      if (comp) {
        for (const cat of comp.categories) {
          if (cat.enabled) loadBracket(cat.id);
        }
      }
      addToast(`${result.categoriesProcessed} catégorie(s), ${result.totalMatches} match(s)`);
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    } finally {
      setDrawLoading(false);
    }
  };

  const generateCategoryDraw = async (catId: number) => {
    if (!id) return;
    const catObj = comp?.categories.find((c) => c.id === catId);
    const catLabel = catObj
      ? `${catObj.ageCategoryName} · ${catObj.weightDivisionName} (${catObj.gender})`
      : "cette catégorie";
    const ok = await confirm({
      title: `Régénérer : ${catLabel}`,
      message: `Êtes-vous sûr de vouloir régénérer le tableau pour ${catLabel} ? Le tableau actuel de cette catégorie sera remplacé.`,
      confirmLabel: "Régénérer la catégorie",
      cancelLabel: "Annuler",
      variant: "warning",
    });
    if (!ok) return;
    setDrawLoading(true);
    try {
      const result = await api.post<{ ok: boolean; categoriesProcessed: number; totalMatches: number }>(
        `/competitions/${id}/categories/${catId}/generate-draw`,
      );
      load();
      await loadBracket(catId);
      addToast(`Tableau régénéré pour ${catLabel} (${result.totalMatches} match(s))`);
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    } finally {
      setDrawLoading(false);
    }
  };

  const lockDraw = async () => {
    if (!id) return;
    const ok = await confirm({
      title: "Confirmer le tableau",
      message: "Êtes-vous sûr de vouloir confirmer le tableau ? Aucune modification des appariements ne sera possible après confirmation.",
      confirmLabel: "Confirmer le tableau",
      cancelLabel: "Annuler",
      variant: "primary",
    });
    if (!ok) return;
    try {
      await api.post(`/competitions/${id}/lock-draw`);
      load();
      addToast("Tableau confirmé");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  const enterResult = async (
    matchId: number,
    scoreA: number,
    scoreB: number,
    resultType: string,
    winnerRegistrationId?: number | null,
  ) => {
    if (!id) return;
    try {
      await api.post(`/competitions/${id}/matches/${matchId}/result`, {
        scoreA,
        scoreB,
        resultType,
        winnerRegistrationId,
      });
      if (comp) {
        for (const cat of comp.categories) {
          if (cat.enabled) loadBracket(cat.id);
        }
      }
      loadRankings();
      addToast("Résultat enregistré");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  const swapAthletes = async (matchIdA: number, matchIdB: number) => {
    if (!id || !selectedCatId) return;
    const bracket = brackets[selectedCatId];
    if (!bracket) return;
    const mA = bracket.matches.find((m) => m.id === matchIdA);
    const mB = bracket.matches.find((m) => m.id === matchIdB);
    if (!mA || !mB) return;
    const regIdA = mA.competitorAId ?? mA.competitorBId;
    const regIdB = mB.competitorAId ?? mB.competitorBId;
    if (!regIdA || !regIdB) return;
    await swapSpecificAthletes(regIdA, regIdB);
  };

  const swapSpecificAthletes = async (regIdA: number, regIdB: number) => {
    if (!id || !selectedCatId) return;
    try {
      const result = await api.post<{ ok: boolean; audit: { sameWilaya: number; sameCity: number; sameClub: number } }>(
        `/competitions/${id}/categories/${selectedCatId}/swap`,
        { regIdA, regIdB },
      );
      setBrackets((prev) => ({
        ...prev,
        [selectedCatId]: { ...prev[selectedCatId]!, audit: result.audit },
      }));
      loadBracket(selectedCatId);
      addToast("Athlètes échangés");
    } catch (e: any) {
      addToast(e.message || "Erreur lors de l'échange", "error");
    }
  };

  const moveAthlete = async (regId: number, targetOrdinal: number, targetSide: "A" | "B") => {
    if (!id || !selectedCatId) return;
    try {
      const result = await api.post<{ ok: boolean; audit: { sameWilaya: number; sameCity: number; sameClub: number } }>(
        `/competitions/${id}/categories/${selectedCatId}/move`,
        { regId, targetOrdinal, targetSide },
      );
      setBrackets((prev) => ({
        ...prev,
        [selectedCatId]: { ...prev[selectedCatId]!, audit: result.audit },
      }));
      loadBracket(selectedCatId);
      addToast("Athlète déplacé");
    } catch (e: any) {
      addToast(e.message || "Erreur lors du déplacement", "error");
    }
  };

  // ── Transition ────────────────────────────────────────────────────────

  const transition = async (action: string) => {
    if (!id) return;
    try {
      await api.post(`/competitions/${id}/${action}`);
      load();
      addToast(action);
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Category toggles ─────────────────────────────────────────────────

  const toggleCategory = async (catId: number, enabled: boolean) => {
    if (!id) return;
    if (!enabled) {
      const cat = comp?.categories.find((c) => c.id === catId);
      if (cat && cat.registrationCount > 0) {
        const ok = await confirm({
          title: "Désactiver la catégorie",
          message: `Cette catégorie contient ${cat.registrationCount} athlète(s). Les inscriptions seront bloquées.`,
          confirmLabel: "Désactiver",
          cancelLabel: "Annuler",
          variant: "warning",
        });
        if (!ok) return;
      }
    }
    try {
      await api.put(`/competitions/${id}/categories/${catId}`, { enabled });
      load();
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  const batchToggle = async (enabled: boolean, filter: { gender?: string; ageCategoryId?: number }) => {
    if (!id) return;
    if (!enabled && filter.gender) {
      const cats = comp?.categories.filter((c) => c.enabled && c.gender === filter.gender) ?? [];
      const totalRegs = cats.reduce((s, c) => s + c.registrationCount, 0);
      if (totalRegs > 0) {
        const ok = await confirm({
          title: "Désactiver les catégories",
          message: `Ces catégories contiennent ${totalRegs} athlète(s). Les inscriptions seront bloquées.`,
          confirmLabel: "Désactiver",
          cancelLabel: "Annuler",
          variant: "warning",
        });
        if (!ok) return;
      }
    }
    try {
      await api.put(`/competitions/${id}/categories`, { enabled, ...filter });
      load();
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Bulk register ─────────────────────────────────────────────────────

  const loadBulkPreviewFn = async (catId: string) => {
    if (!id || !catId) {
      setBulkPreview(null);
      return;
    }
    try {
      const data = await api.get<{
        athletes: Array<{ id: number; firstName: string; lastName: string; weightKg: number | null; clubName: string | null }>;
        total: number;
        categoryName: string;
      }>(`/competitions/${id}/register-bulk/preview?categoryId=${catId}`);
      setBulkPreview(data);
    } catch {
      setBulkPreview(null);
    }
  };

  const executeBulkRegister = async (catId: string) => {
    if (!id || !catId) return;
    setBulkLoading(true);
    try {
      const result = await api.post<{ registered: number; total: number; categoryName: string }>(
        `/competitions/${id}/register-bulk`,
        { subDepartmentId: Number(catId) },
      );
      setBulkPreview(null);
      load();
      addToast(`${result.registered} athlète(s) inscrit(s) dans ${result.categoryName}`);
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Register existing ─────────────────────────────────────────────────

  const registerExisting = async (form: Record<string, string>) => {
    if (!id || !form.athleteId) return;
    try {
      await api.post(`/competitions/${id}/register`, {
        athleteId: Number(form.athleteId),
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        subDepartmentId: form.subDepartmentId ? Number(form.subDepartmentId) : undefined,
      });
      load();
      addToast("Athlète inscrit");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Register inline ───────────────────────────────────────────────────

  const registerInline = async (form: Record<string, string>) => {
    if (!id || !form.firstName || !form.lastName || !form.birthDate || !form.gender) return;
    try {
      await api.post(`/competitions/${id}/register-inline`, {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        gender: form.gender,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        clubId: form.clubId ? Number(form.clubId) : undefined,
      });
      load();
      addToast("Athlète inscrit");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Withdraw ──────────────────────────────────────────────────────────

  const withdraw = async (regId: number) => {
    if (!id) return;
    try {
      await api.post(`/competitions/${id}/withdraw/${regId}`);
      load();
      if (resolution) loadResolution();
      addToast("Retiré");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Resolve ───────────────────────────────────────────────────────────

  const resolveAll = async () => {
    if (!id) return;
    try {
      await api.post(`/competitions/${id}/resolve`);
      load();
      loadResolution();
      addToast("Résolution effectuée");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Edit weight ───────────────────────────────────────────────────────

  const updateWeight = async (regId: number, value: string) => {
    if (!id) return;
    try {
      await api.put(`/competitions/${id}/registrations/${regId}/weight`, {
        weightKg: value ? Number(value) : null,
      });
      load();
      if (resolution) loadResolution();
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Edit category ─────────────────────────────────────────────────────

  const updateCategory = async (regId: number, gender: string, ageCategoryId: string, weightDivisionId: string) => {
    if (!id) return;
    try {
      const selectedCatId = weightDivisionId
        ? enabledCategories.find(
            (c) => c.gender === gender && c.ageCategoryId === Number(ageCategoryId) && c.weightDivisionId === Number(weightDivisionId),
          )?.id
        : null;
      await api.put(`/competitions/${id}/registrations/${regId}/category`, {
        subDepartmentId: selectedCatId ?? null,
      });
      load();
      if (resolution) loadResolution();
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    }
  };

  // ── Filtered athletes ─────────────────────────────────────────────────

  const availableAthletes = useMemo(() => {
    const registeredIds = new Set(registrations.map((r) => r.athleteId));
    return athletes.filter((a) => !registeredIds.has(a.id));
  }, [athletes, registrations]);

  const value: CompetitionContextValue = {
    id,
    comp,
    registrations,
    resolution,
    athletes,
    clubs,
    loading,
    brackets,
    selectedCatId,
    setSelectedCatId,
    toasts,
    addToast,
    dismissToast,
    load,
    loadResolution,
    loadBracket,
    loadRankings,
    rankings,
    generateDraw,
    generateCategoryDraw,
    lockDraw,
    enterResult,
    swapAthletes,
    swapSpecificAthletes,
    moveAthlete,
    transition,
    toggleCategory,
    batchToggle,
    registerExisting,
    registerInline,
    loadBulkPreview: loadBulkPreviewFn,
    bulkPreview,
    executeBulkRegister,
    bulkLoading,
    withdraw,
    resolveAll,
    updateWeight,
    updateCategory,
    drawLoading,
    isOpen,
    isDraft,
    isClosed,
    isDrawGenerated,
    isDrawConfirmed,
    isInProgress,
    isCompleted,
    regCount,
    enabledCategories,
  };

  return <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>;
}
