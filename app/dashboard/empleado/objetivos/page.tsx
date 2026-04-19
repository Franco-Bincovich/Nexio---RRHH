import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getEmpleadoScope } from "@/lib/lider-scope";
import { Target } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";

export default async function ObjetivosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scope = await getEmpleadoScope(user.id);
  if (!scope) redirect("/login");

  const objetivosBase = supabase
    .from("objetivos")
    .select("id, titulo, descripcion, estado, progreso, fecha_vencimiento, categoria")
    .order("created_at", { ascending: false });
  const { data: objetivos } = scope.es_demo
    ? await objetivosBase.eq("empresa_id", scope.empresa_id)
    : await objetivosBase.eq("empleado_id", scope.id);

  const lista = objetivos ?? [];
  const completados = lista.filter((o) => o.estado === "completado").length;
  const enProgreso  = lista.filter((o) => o.estado === "en_progreso").length;
  const pendientes  = lista.filter((o) => o.estado === "pendiente").length;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Mis objetivos</h1>
      <p className="text-secondary text-sm mb-6">
        {completados} de {lista.length} completados
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MiniStat label="Total"       value={lista.length} color="text-white" />
        <MiniStat label="En progreso" value={enProgreso}   color="text-yellow-400" />
        <MiniStat label="Completados" value={completados}  color="text-accent" />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Target}
          titulo="No tenés objetivos asignados todavía"
          descripcion="Tu líder o RRHH los asignará desde el panel de gestión."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((obj) => {
            const progreso = obj.progreso ?? 0;

            return (
              <Card key={obj.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium leading-snug">{obj.titulo}</p>
                  <Badge estado={obj.estado} size="md" className="flex-shrink-0" />
                </div>

                {obj.descripcion && (
                  <p className="text-xs text-secondary/70">{obj.descripcion}</p>
                )}

                <div>
                  <div className="flex justify-between text-xs text-secondary mb-1.5">
                    <span>Progreso</span>
                    <span>{progreso}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-secondary">
                  {obj.categoria && (
                    <span className="bg-white/5 px-2.5 py-1 rounded-full">{obj.categoria}</span>
                  )}
                  {obj.fecha_vencimiento && (
                    <span>
                      Vence:{" "}
                      {new Date(obj.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-AR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="px-5 py-4" noPadding>
      <p className="text-[10px] uppercase tracking-[0.7px] text-secondary/60 mb-1">{label}</p>
      <p className={`text-[22px] font-extrabold ${color}`}>{value}</p>
    </Card>
  );
}
