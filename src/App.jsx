import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Pin, LayoutDashboard, ClipboardList, Users, Plus, Trash2, CheckCircle2,
  Circle, ChevronDown, Save, AlertCircle, X, BookMarked, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { supabase } from "./supabase";
import SEED_DATA from "./seedData.json";

const TABLE_NAME = "ideas1pct";
const REF_DATE = new Date("2026-01-14T00:00:00");
const DAY_MS = 86400000;

const LIDERES = ["Alan", "Alex C", "Alex M", "Andy", "Ceci", "Cristy", "Emma", "Ilse", "Isaac", "Jess", "Julia", "Karen", "Nicole", "Patty", "Tatis"];
const AREAS = ["UGEB", "CH"];
const PROCESOS = [
  "5´s", "Atracción y Selección de Talento", "Comunicación Interna", "Eje 1: Inducción",
  "Eje 2: Servicio al cliente", "Eje 3: Movilidad Social", "Eje 4: Liderazgo y Estrategia",
  "Empoderamientos", "Evento Aniversario", "Experiencia del colaborador", "Iniciativas Humanas",
  "Inventario de Uniformes", "La ventaja competitiva 1%", "Libro de Empoderamientos",
  "Onboarding", "Política de apariencia"
];
const PROCESOS_PRIORITARIOS = [
  "Atracción y Selección de Talento", "Onboarding", "Política de apariencia",
  "Empoderamientos", "Eje 1: Inducción", "Eje 2: Servicio al cliente"
];

/* ---------- helpers ---------- */
function weekNumber(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor((d - REF_DATE) / (7 * DAY_MS)) + 1;
}
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function fmtDateHuman(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function uid() {
  return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function pct(n) {
  return Math.round(n * 100) + "%";
}

/* ---------- Supabase data layer ---------- */
async function fetchIdeas() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("fechaInicio", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function seedIfEmpty() {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  if (count > 0) return;

  // Primera vez que corre la app con la tabla vacía: sube el histórico
  // migrado del Excel, en tandas para no exceder el tamaño de payload.
  const chunkSize = 200;
  for (let i = 0; i < SEED_DATA.length; i += chunkSize) {
    const chunk = SEED_DATA.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from(TABLE_NAME).insert(chunk);
    if (insErr) throw insErr;
  }
}

function subscribeIdeas(callback, onError) {
  (async () => {
    try {
      await seedIfEmpty();
      const initial = await fetchIdeas();
      callback(initial);
    } catch (e) {
      console.error("Error inicial con Supabase:", e);
      onError && onError(e);
    }
  })();

  const channel = supabase
    .channel(`${TABLE_NAME}-changes`)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAME }, async () => {
      try {
        const list = await fetchIdeas();
        callback(list);
      } catch (e) {
        console.error("Error refrescando desde Supabase:", e);
        onError && onError(e);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

async function addIdeasToDb(newOnes) {
  const rows = newOnes.map((idea) => ({ ...idea, id: uid() }));
  const { error } = await supabase.from(TABLE_NAME).insert(rows);
  if (error) throw error;
}

async function updateIdeaInDb(id, patch) {
  const { error } = await supabase.from(TABLE_NAME).update(patch).eq("id", id);
  if (error) throw error;
}

async function deleteIdeaInDb(id) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
  if (error) throw error;
}

/* ---------- design tokens ---------- */
const C = {
  bgApp: "#F6F1E4",
  bgCard: "#FFFDF7",
  bgHeader: "#1E3428",
  ink: "#2B2620",
  inkSoft: "#6B5F4F",
  line: "#E2D8C2",
  amber: "#C98A2B",
  amberSoft: "#F1DDB4",
  green: "#3F7A5A",
  greenSoft: "#DCE9DF",
  blue: "#3B6FA0",
  blueSoft: "#DCE6EE",
  red: "#B4483C",
};
const serif = "'Iowan Old Style','Palatino Linotype',Georgia,'Times New Roman',serif";
const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/* ================= APP ================= */
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [ideas, setIdeas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeColaborador, setActiveColaborador] = useState(LIDERES[0]);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | error

  useEffect(() => {
    const unsub = subscribeIdeas(
      (list) => {
        setIdeas(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const addIdeas = useCallback(async (newOnes) => {
    setSaveState("saving");
    try {
      await addIdeasToDb(newOnes);
      setSaveState("idle");
    } catch (e) {
      console.error(e);
      setSaveState("error");
      throw e;
    }
  }, []);

  const updateIdea = useCallback(async (id, patch) => {
    setSaveState("saving");
    try {
      await updateIdeaInDb(id, patch);
      setSaveState("idle");
    } catch (e) {
      console.error(e);
      setSaveState("error");
    }
  }, []);

  const deleteIdea = useCallback(async (id) => {
    setSaveState("saving");
    try {
      await deleteIdeaInDb(id);
      setSaveState("idle");
    } catch (e) {
      console.error(e);
      setSaveState("error");
    }
  }, []);

  if (loading) {
    return (
      <div style={{ background: C.bgApp, minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, color: C.inkSoft }}>
        Cargando la pizarra…
      </div>
    );
  }

  return (
    <div style={{ background: C.bgApp, minHeight: 480, fontFamily: sans, color: C.ink }}>
      <Header tab={tab} setTab={setTab} saveState={saveState} />
      <div style={{ maxWidth: tab === "dashboard" ? 1080 : 760, margin: "0 auto", padding: "28px 20px 56px" }}>
        {tab === "form" && (
          <FormView onSubmit={addIdeas} defaultColaborador={activeColaborador} onColaborador={setActiveColaborador} />
        )}
        {tab === "dashboard" && <DashboardView ideas={ideas} />}
        {tab === "colaborador" && (
          <ColaboradorView
            ideas={ideas}
            activeColaborador={activeColaborador}
            setActiveColaborador={setActiveColaborador}
            onUpdate={updateIdea}
            onDelete={deleteIdea}
          />
        )}
      </div>
    </div>
  );
}

/* ================= HEADER / TABS ================= */
function Header({ tab, setTab, saveState }) {
  const tabs = [
    { id: "form", label: "Registrar ideas", icon: Plus },
    { id: "dashboard", label: "Pizarra general", icon: LayoutDashboard },
    { id: "colaborador", label: "Panel colaborador", icon: Users },
  ];
  return (
    <div style={{ background: C.bgHeader, color: "#F6F1E4" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pin size={20} style={{ color: C.amber, transform: "rotate(-18deg)" }} />
            <h1 style={{ fontFamily: serif, fontWeight: 600, fontSize: 26, margin: 0, letterSpacing: 0.2 }}>Pizarra 1%</h1>
          </div>
          <div style={{ fontSize: 12.5, color: "#C9CDBF", display: "flex", alignItems: "center", gap: 8 }}>
            <span>Ideas implementadas · GEB</span>
            <SaveIndicator state={saveState} />
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, marginTop: 20 }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 16px",
                  background: active ? C.bgCard : "transparent",
                  color: active ? C.ink : "#D8DAC9",
                  border: "none",
                  borderRadius: "10px 10px 0 0",
                  fontSize: 14,
                  fontFamily: sans,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === "idle") return null;
  const label = state === "saving" ? "Guardando…" : "Sin conexión";
  const color = state === "error" ? "#E7A08E" : "#B9D6C2";
  return <span style={{ color }}>· {label}</span>;
}

/* ================= FORM VIEW (registro por lote) ================= */
function emptyRow() {
  return {
    key: uid(),
    proceso: PROCESOS[0],
    procesoOtro: "",
    equipo: "",
    propuesta: "",
    sistema: "Una vez",
    status: "En proceso",
    evidencia: false,
    aprendizaje: "",
  };
}

function FormView({ onSubmit, defaultColaborador, onColaborador }) {
  const [colaborador, setColaborador] = useState(defaultColaborador || LIDERES[0]);
  const [colaboradorOtro, setColaboradorOtro] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [fechaInicio, setFechaInicio] = useState(todayStr());
  const [firstRow] = useState(() => emptyRow());
  const [rows, setRows] = useState(() => [firstRow]);
  const [openKey, setOpenKey] = useState(firstRow.key);
  const [error, setError] = useState("");
  const [confirmCount, setConfirmCount] = useState(0);

  const colaboradorFinal = colaborador === "__otro__" ? colaboradorOtro.trim() : colaborador;

  function patchRow(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const nr = emptyRow();
    setRows((rs) => [...rs, nr]);
    setOpenKey(nr.key);
  }
  function removeRow(key) {
    setRows((rs) => {
      if (rs.length <= 1) return rs;
      const next = rs.filter((r) => r.key !== key);
      if (openKey === key) setOpenKey(next[0].key);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!colaboradorFinal) { setError("Falta el nombre de quién registra las ideas."); return; }

    const built = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const procesoFinal = r.proceso === "__otro__" ? r.procesoOtro.trim() : r.proceso;
      const hasContent = r.propuesta.trim() || procesoFinal;
      if (!hasContent) continue;
      if (!procesoFinal) { setError(`Falta el proceso en la idea #${i + 1}.`); setOpenKey(r.key); return; }
      if (!r.propuesta.trim()) { setError(`Falta describir la propuesta en la idea #${i + 1}.`); setOpenKey(r.key); return; }
      built.push({
        colaborador: colaboradorFinal,
        area,
        fechaInicio,
        proceso: procesoFinal,
        equipo: r.equipo.trim(),
        propuesta: r.propuesta.trim(),
        sistema: r.sistema,
        status: r.status,
        evidencia: r.status === "Terminado" ? r.evidencia : false,
        aprendizaje: r.status === "Terminado" ? r.aprendizaje.trim() : "",
      });
    }
    if (built.length === 0) { setError("Agrega al menos una idea con proceso y propuesta."); return; }

    setError("");
    try {
      await onSubmit(built);
      onColaborador(colaboradorFinal);
      const nr = emptyRow();
      setRows([nr]);
      setOpenKey(nr.key);
      setConfirmCount(built.length);
    } catch (err) {
      setError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }
  }

  return (
    <div>
      <SectionTitle title="Nuevas ideas" />

      <form onSubmit={handleSubmit} style={{ paddingBottom: 84 }}>
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <Field label="¿Quién las registra?">
            <select value={colaborador} onChange={(e) => setColaborador(e.target.value)} style={selectStyle}>
              {LIDERES.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="__otro__">Otra persona…</option>
            </select>
            {colaborador === "__otro__" && (
              <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Nombre" value={colaboradorOtro} onChange={(e) => setColaboradorOtro(e.target.value)} />
            )}
          </Field>
          <Field label="Fecha de la semana">
            <input type="date" style={inputStyle} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </Field>
          <Field label="Área" noMargin>
            <PillGroup options={AREAS} value={area} onChange={setArea} />
          </Field>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r, idx) =>
            r.key === openKey ? (
              <IdeaFormRow
                key={r.key}
                index={idx}
                row={r}
                canRemove={rows.length > 1}
                onChange={(patch) => patchRow(r.key, patch)}
                onRemove={() => removeRow(r.key)}
                onCollapse={() => setOpenKey(null)}
              />
            ) : (
              <IdeaRowSummary
                key={r.key}
                index={idx}
                row={r}
                onOpen={() => setOpenKey(r.key)}
                onRemove={() => removeRow(r.key)}
              />
            )
          )}
        </div>

        <button type="button" onClick={addRow} style={addRowButtonStyle}>
          <Plus size={17} /> Agregar otra idea
        </button>

        {error && (
          <div style={{ display: "flex", gap: 7, alignItems: "center", color: C.red, fontSize: 13.5, margin: "16px 0 0" }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div style={stickyBarStyle}>
          <span style={{ fontSize: 12.5, color: C.inkSoft }}>{rows.length} idea{rows.length > 1 ? "s" : ""} en este lote</span>
          <button type="submit" style={submitButtonStyle}>
            <Save size={16} /> Enviar {rows.length > 1 ? `${rows.length} ideas` : "idea"}
          </button>
        </div>
      </form>

      <ConfirmModal count={confirmCount} onClose={() => setConfirmCount(0)} />
    </div>
  );
}

function ConfirmModal({ count, onClose }) {
  if (!count) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(43,38,32,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bgCard, borderRadius: 16, padding: "28px 24px", maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 12px 30px rgba(43,38,32,0.25)" }}
      >
        <CheckCircle2 size={40} style={{ color: C.green, marginBottom: 10 }} />
        <h3 style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, margin: "0 0 6px" }}>¡Enviado!</h3>
        <p style={{ color: C.inkSoft, fontSize: 14, margin: "0 0 20px" }}>
          {count} idea{count > 1 ? "s" : ""} registrada{count > 1 ? "s" : ""} correctamente.
        </p>
        <button type="button" onClick={onClose} style={{ ...submitButtonStyle, width: "100%" }}>
          Aceptar
        </button>
      </div>
    </div>
  );
}

function IdeaRowSummary({ index, row, onOpen, onRemove }) {
  const procesoLabel = row.proceso === "__otro__" ? (row.procesoOtro || "Proceso (otro)…") : row.proceso;
  const incomplete = !row.propuesta.trim();
  const preview = row.propuesta ? row.propuesta : "Toca para describir la propuesta";
  const isDone = row.status === "Terminado";
  return (
    <div
      onClick={onOpen}
      style={{ ...cardStyle, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
    >
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
        background: isDone ? C.greenSoft : C.blueSoft,
        color: isDone ? C.green : C.blue,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: incomplete ? C.red : C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {procesoLabel}
        </div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preview}</div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", color: C.inkSoft, padding: 8, flexShrink: 0 }} title="Quitar esta idea">
        <X size={17} />
      </button>
    </div>
  );
}

function IdeaFormRow({ index, row, canRemove, onChange, onRemove, onCollapse }) {
  return (
    <div style={{ ...cardStyle, position: "relative", borderColor: C.green }}>
      <div onClick={onCollapse} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, cursor: "pointer" }}>
        <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 16 }}>Idea #{index + 1}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {canRemove && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 8 }} title="Quitar esta idea">
              <Trash2 size={16} />
            </button>
          )}
          <ChevronDown size={18} style={{ color: C.inkSoft, transform: "rotate(180deg)" }} />
        </div>
      </div>

      <Field label="Proceso o eje">
        <select value={row.proceso} onChange={(e) => onChange({ proceso: e.target.value })} style={selectStyle}>
          {PROCESOS.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="__otro__">Otro…</option>
        </select>
        {row.proceso === "__otro__" && (
          <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Nombre del proceso" value={row.procesoOtro} onChange={(e) => onChange({ procesoOtro: e.target.value })} />
        )}
      </Field>

      <Field label="Propuesta de mejora">
        <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="¿Qué se hizo o se va a hacer?" value={row.propuesta} onChange={(e) => onChange({ propuesta: e.target.value })} />
      </Field>

      <Field label="Equipo involucrado (opcional)">
        <input style={inputStyle} placeholder="Ej. Karen / Alan" value={row.equipo} onChange={(e) => onChange({ equipo: e.target.value })} />
      </Field>

      <Field label="Tipo">
        <PillGroup options={["Una vez", "Sistema"]} value={row.sistema} onChange={(v) => onChange({ sistema: v })} />
      </Field>

      <Field label="Estado" noMargin={row.status !== "Terminado"}>
        <PillGroup options={["En proceso", "Terminado"]} value={row.status} onChange={(v) => onChange({ status: v })} />
      </Field>

      {row.status === "Terminado" && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, margin: "16px 0 14px", cursor: "pointer" }}>
            <input type="checkbox" checked={row.evidencia} onChange={(e) => onChange({ evidencia: e.target.checked })} style={{ width: 18, height: 18 }} />
            Ya quedó registrada en la bitácora de evidencia
          </label>
          <Field label="Aprendizaje (opcional)" noMargin>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="¿Qué aprendimos al implementarla?" value={row.aprendizaje} onChange={(e) => onChange({ aprendizaje: e.target.value })} />
          </Field>
        </>
      )}
    </div>
  );
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: "11px 18px",
              minHeight: 44,
              borderRadius: 9,
              border: `1px solid ${active ? C.green : C.line}`,
              background: active ? C.green : "#FFFFFF",
              color: active ? "#FFFDF7" : C.ink,
              fontSize: 14.5,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              flex: "1 1 auto",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ================= DASHBOARD VIEW (solo lectura) ================= */
function DashboardView({ ideas }) {
  const today = todayStr();
  const curWeek = weekNumber(today);
  const prevWeek = curWeek - 1;

  const [pasadaOpen, setPasadaOpen] = useState(false);
  const [actualOpen, setActualOpen] = useState(false);
  const [weekFilter, setWeekFilter] = useState(String(curWeek)); // default: semana actual

  const withWeek = useMemo(() => ideas.map((i) => ({ ...i, _week: weekNumber(i.fechaInicio) })), [ideas]);
  const semanaActualIdeas = withWeek.filter((i) => i._week === curWeek);
  const semanaPasadaIdeas = withWeek.filter((i) => i._week === prevWeek);

  const total = ideas.length;
  const terminadas = ideas.filter((i) => i.status === "Terminado").length;
  const enBitacora = ideas.filter((i) => i.evidencia).length;
  const enProceso = total - terminadas;

  const totalSemana = semanaActualIdeas.length;
  const terminadasSemana = semanaActualIdeas.filter((i) => i.status === "Terminado").length;
  const enProcesoSemana = totalSemana - terminadasSemana;
  const enBitacoraSemana = semanaActualIdeas.filter((i) => i.evidencia).length;

  const totalPasada = semanaPasadaIdeas.length;
  const terminadasPasada = semanaPasadaIdeas.filter((i) => i.status === "Terminado").length;
  const enProcesoPasada = totalPasada - terminadasPasada;
  const enBitacoraPasada = semanaPasadaIdeas.filter((i) => i.evidencia).length;

  const weekOptions = useMemo(() => {
    const opts = [];
    for (let w = curWeek; w >= 1; w--) opts.push(w);
    return opts;
  }, [curWeek]);

  const scopedIdeas = useMemo(() => {
    if (weekFilter === "acumulado") return ideas;
    const w = Number(weekFilter);
    return withWeek.filter((i) => i._week === w);
  }, [weekFilter, ideas, withWeek]);

  const metaForScope = weekFilter === "acumulado" ? Math.max(curWeek, 1) : 1;
  const scopeLabel = weekFilter === "acumulado" ? "acumulado" : (Number(weekFilter) === curWeek ? `semana actual · S${curWeek}` : `semana ${weekFilter}`);

  const porProceso = useMemo(() => {
    const map = {};
    scopedIdeas.forEach((i) => {
      const key = i.proceso || "Sin proceso";
      if (!map[key]) map[key] = { total: 0, terminadas: 0, enProceso: 0 };
      map[key].total++;
      if (i.status === "Terminado") map[key].terminadas++;
      else map[key].enProceso++;
    });
    return map;
  }, [scopedIdeas]);

  const porColaborador = useMemo(() => {
    const map = {};
    scopedIdeas.forEach((i) => {
      if (!i.colaborador) return;
      if (!map[i.colaborador]) map[i.colaborador] = { total: 0, terminadas: 0, enProceso: 0 };
      map[i.colaborador].total++;
      if (i.status === "Terminado") map[i.colaborador].terminadas++;
      else map[i.colaborador].enProceso++;
    });
    return Object.entries(map)
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [scopedIdeas]);

  const todosLosProcesos = useMemo(() => {
    const known = new Set(PROCESOS);
    Object.keys(porProceso).forEach((p) => known.add(p));
    return Array.from(known);
  }, [porProceso]);

  return (
    <div>
      <SectionTitle title="Pizarra general" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        <WeekList
          title={`Semana pasada (S${prevWeek})`}
          items={semanaPasadaIdeas}
          empty="No hubo ideas registradas la semana pasada."
          open={pasadaOpen}
          onToggle={() => setPasadaOpen((v) => !v)}
        />
        <WeekList
          title={`Semana corriendo (S${curWeek})`}
          items={semanaActualIdeas}
          empty="Nadie ha registrado ideas esta semana todavía."
          highlight
          open={actualOpen}
          onToggle={() => setActualOpen((v) => !v)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
        <div>
          <SectionTitle title="Esta semana" small />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <MetricCard icon={ClipboardList} label="Ideas" value={totalSemana} trend={totalSemana - totalPasada} />
            <MetricCard icon={CheckCircle2} label="Terminadas" value={terminadasSemana} trend={terminadasSemana - terminadasPasada} />
            <MetricCard icon={Circle} label="En proceso" value={enProcesoSemana} trend={enProcesoSemana - enProcesoPasada} />
            <MetricCard icon={BookMarked} label="En bitácora" value={enBitacoraSemana} trend={enBitacoraSemana - enBitacoraPasada} />
          </div>
        </div>
        <div>
          <SectionTitle title="Acumulado" small />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <MetricCard icon={ClipboardList} label="Ideas" value={total} trend={totalSemana - totalPasada} />
            <MetricCard icon={CheckCircle2} label="Terminadas" value={terminadas} trend={terminadasSemana - terminadasPasada} />
            <MetricCard icon={Circle} label="En proceso" value={enProceso} trend={enProcesoSemana - enProcesoPasada} />
            <MetricCard icon={BookMarked} label="En bitácora" value={enBitacora} trend={enBitacoraSemana - enBitacoraPasada} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <WeekSelector value={weekFilter} onChange={setWeekFilter} options={weekOptions} currentWeek={curWeek} />
      </div>

      <SectionTitle title={`Procesos prioritarios (${scopeLabel})`} small />
      <ProcesoTable procesos={PROCESOS_PRIORITARIOS} data={porProceso} meta={metaForScope} showMeta />

      <div style={{ height: 26 }} />

      <SectionTitle title={`Todos los procesos (${scopeLabel})`} small />
      <ProcesoTable procesos={todosLosProcesos} data={porProceso} meta={metaForScope} showMeta />

      <div style={{ height: 26 }} />

      <SectionTitle title={`Totales por colaborador (${scopeLabel})`} small />
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: C.amberSoft }}>
              {["Colaborador", "Total", "En proceso", "%", "Terminado", "%"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {porColaborador.length === 0 && (
              <tr><td style={tdStyle} colSpan={6}><span style={{ color: C.inkSoft }}>Sin ideas en este periodo.</span></td></tr>
            )}
            {porColaborador.map((row, idx) => (
              <tr key={row.nombre} style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}>
                <td style={tdStyle}><strong>{row.nombre}</strong></td>
                <td style={tdStyle}>{row.total}</td>
                <td style={tdStyle}>{row.enProceso}</td>
                <td style={tdStyle}>{row.total ? pct(row.enProceso / row.total) : "—"}</td>
                <td style={tdStyle}>{row.terminadas}</td>
                <td style={tdStyle}>{row.total ? pct(row.terminadas / row.total) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend }) {
  const hasTrend = typeof trend === "number";
  const trendColor = trend > 0 ? C.green : trend < 0 ? C.red : C.inkSoft;
  return (
    <div style={{ ...cardStyle, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.inkSoft, fontSize: 11 }}>
        {Icon && <Icon size={12} />} {label}
      </div>
      <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 600 }}>{value}</div>
      {hasTrend && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: trendColor }}>
          {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
          {trend === 0 ? "igual que la pasada" : `${trend > 0 ? "+" : ""}${trend} vs. pasada`}
        </div>
      )}
    </div>
  );
}

function WeekSelector({ value, onChange, options, currentWeek }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 12.5, color: C.inkSoft }}>Semana:</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...selectStyle, width: "auto", fontWeight: 600 }}>
        <option value="acumulado">Acumulado</option>
        {options.map((w) => (
          <option key={w} value={w}>{w === currentWeek ? `Semana ${w} (actual)` : `Semana ${w}`}</option>
        ))}
      </select>
    </div>
  );
}

function WeekList({ title, items, empty, highlight, open, onToggle }) {
  return (
    <div style={{ ...cardStyle, borderColor: highlight ? C.green : C.line }}>
      <h3
        onClick={onToggle}
        style={{ fontFamily: serif, fontSize: 16, margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
      >
        {title}
        <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: highlight ? C.green : C.inkSoft, background: highlight ? C.greenSoft : C.line, padding: "2px 8px", borderRadius: 999 }}>
          {items.length}
        </span>
        <ChevronDown size={15} style={{ color: C.inkSoft, marginLeft: "auto", transform: open ? "rotate(180deg)" : "none" }} />
      </h3>
      {open && (
        <div style={{ marginTop: 12 }}>
          {items.length === 0 && <p style={{ color: C.inkSoft, fontSize: 13, margin: 0 }}>{empty}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.slice(0, 8).map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                <StatusDot status={it.status} />
                <div>
                  <div><strong>{it.colaborador}</strong> <span style={{ color: C.inkSoft }}>· {it.proceso}</span></div>
                  <div style={{ color: C.inkSoft }}>{it.propuesta}</div>
                </div>
              </div>
            ))}
            {items.length > 8 && <div style={{ fontSize: 12, color: C.inkSoft }}>+ {items.length - 8} más</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ProcesoTable({ procesos, data, meta, showMeta }) {
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: C.amberSoft }}>
            {["Proceso", "Real", showMeta && "Meta", showMeta && "Dif", showMeta && "Cumplimiento", "En proceso", "Terminado"]
              .filter(Boolean)
              .map((h) => <th key={h} style={thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {procesos.map((p, idx) => {
            const d = data[p] || { total: 0, terminadas: 0, enProceso: 0 };
            const dif = d.total - meta;
            return (
              <tr key={p} style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}>
                <td style={tdStyle}>{p}</td>
                <td style={tdStyle}><strong>{d.total}</strong></td>
                {showMeta && <td style={tdStyle}>{meta}</td>}
                {showMeta && (
                  <td style={{ ...tdStyle, color: dif < 0 ? C.red : C.green }}>{dif > 0 ? `+${dif}` : dif}</td>
                )}
                {showMeta && <td style={tdStyle}>{meta ? pct(d.total / meta) : "—"}</td>}
                <td style={tdStyle}>{d.enProceso}</td>
                <td style={tdStyle}>{d.terminadas}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({ label, value, onClick, active }) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        ...cardStyle,
        cursor: clickable ? "pointer" : "default",
        borderColor: active ? C.green : C.line,
        background: active ? C.greenSoft : C.bgCard,
      }}
    >
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

/* ================= COLABORADOR VIEW ================= */
function ColaboradorView({ ideas, activeColaborador, setActiveColaborador, onUpdate, onDelete }) {
  const curWeek = weekNumber(todayStr());
  const [filter, setFilter] = useState("todas"); // todas | pendientes | terminadas | bitacora
  const [weekFilter, setWeekFilter] = useState(String(curWeek)); // default: semana actual

  const weekOptions = useMemo(() => {
    const opts = [];
    for (let w = curWeek; w >= 1; w--) opts.push(w);
    return opts;
  }, [curWeek]);

  const nombres = useMemo(() => {
    const set = new Set(LIDERES);
    ideas.forEach((i) => i.colaborador && set.add(i.colaborador));
    return Array.from(set).sort();
  }, [ideas]);

  const mias = useMemo(
    () => ideas.filter((i) => i.colaborador === activeColaborador).sort((a, b) => (b.fechaInicio || "").localeCompare(a.fechaInicio || "")),
    [ideas, activeColaborador]
  );

  const miasEnSemana = useMemo(() => {
    if (weekFilter === "acumulado") return mias;
    const w = Number(weekFilter);
    return mias.filter((i) => weekNumber(i.fechaInicio) === w);
  }, [mias, weekFilter]);

  const total = miasEnSemana.length;
  const terminadas = miasEnSemana.filter((i) => i.status === "Terminado").length;
  const pendientes = total - terminadas;
  const enBitacora = miasEnSemana.filter((i) => i.evidencia).length;

  const visibles = useMemo(() => {
    if (filter === "pendientes") return miasEnSemana.filter((i) => i.status !== "Terminado");
    if (filter === "terminadas") return miasEnSemana.filter((i) => i.status === "Terminado");
    if (filter === "bitacora") return miasEnSemana.filter((i) => i.evidencia);
    return miasEnSemana;
  }, [miasEnSemana, filter]);

  function toggleFilter(f) {
    setFilter((cur) => (cur === f ? "todas" : f));
  }

  return (
    <div>
      <SectionTitle title="Panel colaborador" />

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <label style={{ fontSize: 12.5, color: C.inkSoft, display: "block", marginBottom: 6 }}>Colaborador</label>
          <select
            value={activeColaborador}
            onChange={(e) => { setActiveColaborador(e.target.value); setFilter("todas"); }}
            style={{ ...selectStyle, maxWidth: 260, fontSize: 16, fontFamily: serif, fontWeight: 600 }}
          >
            {nombres.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12.5, color: C.inkSoft, display: "block", marginBottom: 6 }}>Semana</label>
          <WeekSelector value={weekFilter} onChange={setWeekFilter} options={weekOptions} currentWeek={curWeek} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total" value={total} onClick={() => setFilter("todas")} active={filter === "todas"} />
        <KpiCard label="Pendientes" value={pendientes} onClick={() => toggleFilter("pendientes")} active={filter === "pendientes"} />
        <KpiCard label="Terminadas" value={terminadas} onClick={() => toggleFilter("terminadas")} active={filter === "terminadas"} />
        <KpiCard label="En bitácora" value={enBitacora} onClick={() => toggleFilter("bitacora")} active={filter === "bitacora"} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibles.length === 0 && (
          <p style={{ color: C.inkSoft, fontSize: 14 }}>
            {miasEnSemana.length === 0 ? `${activeColaborador} no tiene ideas registradas en este periodo.` : "No hay ideas en este filtro."}
          </p>
        )}
        {visibles.map((it) => <IdeaRow key={it.id} idea={it} onUpdate={onUpdate} onDelete={onDelete} />)}
      </div>
    </div>
  );
}

function IdeaRow({ idea, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = idea.status === "Terminado";

  return (
    <div style={{ ...cardStyle, padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          onClick={() => onUpdate(idea.id, { status: isDone ? "En proceso" : "Terminado" })}
          title="Cambiar estado"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1 }}
        >
          <StatusDot status={idea.status} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline", fontSize: 12, color: C.inkSoft, marginBottom: 3 }}>
            <span>S{weekNumber(idea.fechaInicio)}</span>
            <span>· {fmtDateHuman(idea.fechaInicio)}</span>
            <span>· {idea.proceso}</span>
            <span>· {idea.area}</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.45, cursor: "pointer" }} onClick={() => setExpanded((v) => !v)}>
            {idea.propuesta}
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, marginTop: 8, cursor: "pointer", color: idea.evidencia ? C.green : C.inkSoft }}>
            <input type="checkbox" checked={!!idea.evidencia} onChange={(e) => onUpdate(idea.id, { evidencia: e.target.checked })} />
            <BookMarked size={13} /> En bitácora de evidencia
          </label>

          {expanded && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                placeholder="Aprendizaje…"
                value={idea.aprendizaje || ""}
                onChange={(e) => onUpdate(idea.id, { aprendizaje: e.target.value })}
                style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
              />
              <button
                onClick={() => { if (confirm("¿Eliminar esta idea?")) onDelete(idea.id); }}
                style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.red, fontSize: 12.5, cursor: "pointer", padding: 0 }}
              >
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          )}
        </div>

        <ChevronDown size={15} style={{ color: C.inkSoft, transform: expanded ? "rotate(180deg)" : "none", cursor: "pointer", flexShrink: 0 }} onClick={() => setExpanded((v) => !v)} />
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const isDone = status === "Terminado";
  return isDone
    ? <CheckCircle2 size={15} style={{ color: C.green, marginTop: 2, flexShrink: 0 }} />
    : <Circle size={15} style={{ color: C.blue, marginTop: 2, flexShrink: 0 }} />;
}

/* ================= UI PRIMITIVES ================= */
function SectionTitle({ eyebrow, title, small }) {
  return (
    <div style={{ marginBottom: small ? 12 : 18 }}>
      {eyebrow && <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginBottom: 3 }}>{eyebrow}</div>}
      <h2 style={{ fontFamily: serif, fontSize: small ? 19 : 24, fontWeight: 600, margin: 0 }}>{title}</h2>
    </div>
  );
}

function Field({ label, children, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 16, width: "100%" }}>
      <label style={{ display: "block", fontSize: 13, color: C.inkSoft, marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

const cardStyle = {
  background: C.bgCard,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  padding: 16,
};
const inputStyle = {
  width: "100%",
  padding: "12px 13px",
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  fontSize: 16,
  minHeight: 46,
  fontFamily: sans,
  color: C.ink,
  background: "#FFFFFF",
  boxSizing: "border-box",
};
const selectStyle = { ...inputStyle };
const submitButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: C.green,
  color: "#FFFDF7",
  border: "none",
  borderRadius: 10,
  padding: "13px 22px",
  minHeight: 48,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0,
};
const addRowButtonStyle = {
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "transparent",
  color: C.green,
  border: `1.5px dashed ${C.green}`,
  borderRadius: 10,
  padding: "13px 16px",
  minHeight: 48,
  fontSize: 14.5,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 14,
  boxSizing: "border-box",
};
const stickyBarStyle = {
  position: "sticky",
  bottom: 0,
  marginTop: 18,
  marginLeft: -20,
  marginRight: -20,
  padding: "12px 20px",
  background: C.bgApp,
  borderTop: `1px solid ${C.line}`,
  boxShadow: "0 -6px 14px rgba(43,38,32,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  zIndex: 5,
};
const thStyle = { textAlign: "left", padding: "10px 14px", fontSize: 12, color: C.inkSoft, fontWeight: 600 };
const tdStyle = { padding: "9px 14px", verticalAlign: "middle" };
