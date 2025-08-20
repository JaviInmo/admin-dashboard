"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  User,
  Shield,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/input";

import {
  listAdminAvailableOptions,
  listUsersWithPermissions,
  listProperties,
  grantResourcePermission,
  revokeResourcePermissionById,
  grantPropertyAccess,
  revokePropertyAccessById,
} from "@/lib/services/permissions";

type UiPermissions = Record<string, Record<string, boolean>>;

export interface UserPermissionsTableProps {
  userId: number;
  userLabel?: string | null;
  onUpdated?: () => void | Promise<void>;
}

export default function UserPermissionsTableModern({
  userId,
  userLabel,
  onUpdated,
}: UserPermissionsTableProps) {
  const [loading, setLoading] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [availableActions, setAvailableActions] = React.useState<
    Record<string, string[]>
  >({});
  const [resourceLabels, setResourceLabels] = React.useState<
    Record<string, string>
  >({});
  const [actionLabels, setActionLabels] = React.useState<
    Record<string, string>
  >({});

  const [permissions, setPermissions] = React.useState<UiPermissions>({});
  const permissionIdMapRef = React.useRef<Record<string, number | null>>({});

  const [properties, setProperties] = React.useState<
    Array<{ id: number; address?: string }>
  >([]);
  const [selectedProperties, setSelectedProperties] = React.useState<
    Record<number, { checked: boolean; accessId?: number; accessType?: string }>
  >({});

  const [displayName, setDisplayName] = React.useState<string>(
    userLabel ?? `#${userId}`
  );


  const [hasChanges, setHasChanges] = React.useState(false);


  // Search states
  const [search, setSearch] = React.useState<string>("");
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (userLabel) setDisplayName(userLabel);
    else setDisplayName(`#${userId}`);
  }, [userId, userLabel]);

  // Focus + highlight inicial del input
  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  function deriveAvailableFromOptions(opts: any) {
    const av: Record<string, string[]> = {};
    const resLabels: Record<string, string> = {};
    const actLabels: Record<string, string> = {};

    const FALLBACK_RESOURCES = [
      { id: "client", label: "Clientes" },
      { id: "guard", label: "Guardias" },
      { id: "expense", label: "Gastos" },
      { id: "shift", label: "Turnos" },
    ];
    const FALLBACK_ACTIONS = [
      "create",
      "read",
      "update",
      "delete",
      "approve",
      "assign",
    ];

    if (!opts) {
      FALLBACK_RESOURCES.forEach((r) => {
        av[r.id] = FALLBACK_ACTIONS.slice();
        resLabels[r.id] = r.label;
      });
      return { av, resLabels, actLabels };
    }

    const resourcesArr = Array.isArray(opts.resource_types)
      ? opts.resource_types
      : [];
    const actionsArr = Array.isArray(opts.actions) ? opts.actions : [];

    if (resourcesArr.length > 0 && actionsArr.length > 0) {
      resourcesArr.forEach((r: any) => {
        const rv = String(r.value ?? r).toLowerCase();
        av[rv] = actionsArr.map((a: any) => String(a.value ?? a).toLowerCase());
        resLabels[rv] = String(r.label ?? r.value ?? rv);
      });
      actionsArr.forEach((a: any) => {
        const avv = String(a.value ?? a).toLowerCase();
        actLabels[avv] = String(a.label ?? a.value ?? avv);
      });
      return { av, resLabels, actLabels };
    }

    if (Array.isArray(opts)) {
      opts.forEach((it: any) => {
        if (typeof it === "string" && it.includes(".")) {
          const [sec, act] = it.split(".");
          const s = sec.toLowerCase();
          const a = act.toLowerCase();
          av[s] = av[s] ?? [];
          if (!av[s].includes(a)) av[s].push(a);
        } else if (it && typeof it === "object") {
          const codename = it.codename || it.permission || it.code || "";
          if (typeof codename === "string" && codename.includes(".")) {
            const [sec, act] = codename.split(".");
            const s = sec.toLowerCase();
            const a = act.toLowerCase();
            av[s] = av[s] ?? [];
            if (!av[s].includes(a)) av[s].push(a);
            resLabels[s] = String(it.resource_label ?? it.resource ?? s);
            actLabels[a] = String(it.action_label ?? it.action ?? a);
          } else if (it.resource && it.action) {
            const s = String(it.resource).toLowerCase();
            const a = String(it.action).toLowerCase();
            av[s] = av[s] ?? [];
            if (!av[s].includes(a)) av[s].push(a);
            resLabels[s] = String(it.resource_label ?? it.resource ?? s);
            actLabels[a] = String(it.action_label ?? it.action ?? a);
          }
        }
      });
    }

    if (Object.keys(av).length === 0) {
      FALLBACK_RESOURCES.forEach((r) => {
        av[r.id] = ["create", "read", "update", "delete"];
        resLabels[r.id] = r.label;
      });
    }

    return { av, resLabels, actLabels };
  }

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingOptions(true);
      setError(null);

      permissionIdMapRef.current = {};
      setPermissions({});
      setAvailableActions({});
      setResourceLabels({});
      setActionLabels({});
      setSelectedProperties({});
      setProperties([]);

      try {
        const [optsRes, usersRes, propsRes] = await Promise.allSettled([
          listAdminAvailableOptions(),
          listUsersWithPermissions(),
          listProperties({ page_size: 200 }),
        ]);

        if (!mounted) return;

        const optsVal = optsRes.status === "fulfilled" ? optsRes.value : null;
        const usersVal =
          usersRes.status === "fulfilled" ? usersRes.value : null;
        const propsVal =
          propsRes.status === "fulfilled" ? propsRes.value : null;

        const { av, resLabels, actLabels } =
          deriveAvailableFromOptions(optsVal);
        setAvailableActions(av);
        setResourceLabels(resLabels);
        setActionLabels(actLabels);

        const initialPermBooleans: UiPermissions = {};
        const initialPropMap: Record<
          number,
          { checked: boolean; accessId?: number; accessType?: string }
        > = {};

        if (usersVal && Array.isArray((usersVal as any).users)) {
          const found = (usersVal as any).users.find(
            (u: any) => Number(u.id) === Number(userId)
          );
          if (found) {
            if (!userLabel) {
              const uname = found.username ?? found.name ?? null;
              if (uname) setDisplayName(uname);
            }

            if (Array.isArray(found.resource_permissions)) {
              found.resource_permissions.forEach((rp: any) => {
                const resource = String(
                  rp.resource_type ?? rp.resource ?? ""
                ).toLowerCase();
                const action = String(rp.action ?? "").toLowerCase();
                if (!resource) return;
                permissionIdMapRef.current[`${resource}.${action}`] =
                  Number(rp.id ?? rp.permission_id ?? rp.pk ?? null) || null;
                initialPermBooleans[resource] =
                  initialPermBooleans[resource] ?? {};
                initialPermBooleans[resource][action] = true;
              });
            }

            if (Array.isArray(found.property_access)) {
              found.property_access.forEach((pa: any) => {
                const pid = Number(
                  pa.property_id ?? pa.property ?? pa.propertyId ?? Number.NaN
                );
                if (Number.isNaN(pid)) return;
                initialPropMap[pid] = {
                  checked: true,
                  accessId:
                    Number(pa.id ?? pa.access_id ?? pa.pk ?? null) || undefined,
                  accessType: String(
                    pa.access_type ?? pa.accessType ?? "viewer"
                  ),
                };
              });
            }
          }
        }

        const seed: UiPermissions = {};
        for (const [resKey, acts] of Object.entries(av)) {
          seed[resKey] = {};
          acts.forEach((a) => {
            seed[resKey][a] = Boolean(
              initialPermBooleans[resKey]?.[a] ?? false
            );
          });
        }

        setPermissions(seed);
        setSelectedProperties(initialPropMap);

        const items = Array.isArray(propsVal)
          ? propsVal
          : propsVal?.results ?? [];
        const simple = items.map((p: any) => ({
          id: p.id,
          address: p.address ?? p.name ?? String(p.id),
        }));
        setProperties(simple);
      } catch (err: any) {
        console.error("[UserPermissionsTable] load error", err);
        setError("Error cargando permisos/usuario");
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [userId, userLabel]);

const handleToggle = (resource: string, action: string, checked: boolean) => {
  setPermissions((prev) => ({
    ...prev,
    [resource]: {
      ...(prev?.[resource] ?? {}),
      [action]: checked,
    },
  }));
  setHasChanges(true);
};

const toggleProperty = (id: number, checked: boolean) => {
  setSelectedProperties((prev) => ({
    ...prev,
    [id]: {
      checked,
      accessId: prev?.[id]?.accessId,
      accessType: prev?.[id]?.accessType ?? "viewer",
    },
  }));
  setHasChanges(true);
};

const setPropertyAccessType = (id: number, type: string) => {
  setSelectedProperties((prev) => ({
    ...prev,
    [id]: {
      checked: prev?.[id]?.checked ?? false,
      accessId: prev?.[id]?.accessId,
      accessType: type,
    },
  }));
  setHasChanges(true);
};

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const toGrant: Array<{ resource: string; action: string }> = [];
      const toRevokeIds: number[] = [];

      for (const [res, acts] of Object.entries(availableActions)) {
        for (const act of acts) {
          const key = `${res}.${act}`;
          const checked = Boolean(permissions[res]?.[act]);
          const existingId = permissionIdMapRef.current[key] ?? null;
          if (checked && !existingId) {
            toGrant.push({ resource: res, action: act });
          } else if (!checked && existingId) {
            toRevokeIds.push(Number(existingId));
          }
        }
      }

      for (const g of toGrant) {
        try {
          const r = await grantResourcePermission(
            userId,
            g.resource,
            g.action,
            "Otorgado desde UI"
          );
          const createdId = Number(r?.id ?? r?.permission_id ?? r?.pk ?? null);
          if (createdId)
            permissionIdMapRef.current[`${g.resource}.${g.action}`] = createdId;
        } catch (err: any) {
          console.error("grantResourcePermission failed", err);
          setError("Error otorgando permisos (ver consola)");
          toast.error("Error otorgando permisos");
          setLoading(false);
          return;
        }
      }

      for (const pid of toRevokeIds) {
        try {
          await revokeResourcePermissionById(pid, "Revocado desde UI");
          for (const k of Object.keys(permissionIdMapRef.current)) {
            if (permissionIdMapRef.current[k] === pid)
              permissionIdMapRef.current[k] = null;
          }
        } catch (err: any) {
          console.error("revokeResourcePermissionById failed", err);
          setError("Error revocando permisos (ver consola)");
          toast.error("Error revocando permisos");
          setLoading(false);
          return;
        }
      }

      const grants: Array<{ propertyId: number; accessType: string }> = [];
      const revokes: number[] = [];
      const updates: Array<{
        accessId: number;
        propertyId: number;
        accessType: string;
      }> = [];

      for (const [pidStr, val] of Object.entries(selectedProperties)) {
        const pid = Number(pidStr);
        if (val.checked && !val.accessId) {
          grants.push({
            propertyId: pid,
            accessType: val.accessType ?? "viewer",
          });
        } else if (!val.checked && val.accessId) {
          revokes.push(Number(val.accessId));
        } else if (val.checked && val.accessId) {
          updates.push({
            accessId: Number(val.accessId),
            propertyId: pid,
            accessType: val.accessType ?? "viewer",
          });
        }
      }

      for (const g of grants) {
        try {
          const r = await grantPropertyAccess(
            userId,
            g.propertyId,
            g.accessType,
            undefined,
            "Otorgado desde UI"
          );
          const createdId = Number(r?.id ?? r?.access_id ?? r?.pk ?? null);
          if (createdId) {
            setSelectedProperties((prev) => ({
              ...(prev ?? {}),
              [g.propertyId]: {
                checked: true,
                accessId: createdId,
                accessType: g.accessType,
              },
            }));
          }
        } catch (err: any) {
          console.error("grantPropertyAccess failed", err);
          setError("Error otorgando accesos a propiedades (ver consola)");
          toast.error("Error en accesos a propiedades");
          setLoading(false);
          return;
        }
      }

      for (const u of updates) {
        try {
          await grantPropertyAccess(
            userId,
            u.propertyId,
            u.accessType,
            undefined,
            "Actualizado desde UI"
          );
        } catch (err: any) {
          console.error("update property access failed", err);
          setError("Error actualizando accesos (ver consola)");
          toast.error("Error actualizando accesos");
          setLoading(false);
          return;
        }
      }

      for (const aid of revokes) {
        try {
          await revokePropertyAccessById(aid, "Revocado desde UI");
          setSelectedProperties((prev) => {
            const copy = { ...(prev ?? {}) };
            for (const [kStr, v] of Object.entries(copy)) {
              if (v?.accessId === aid) {
                delete copy[Number(kStr)];
              }
            }
            return copy;
          });
        } catch (err: any) {
          console.error("revokePropertyAccessById failed", err);
          setError("Error revocando accesos (ver consola)");
          toast.error("Error revocando accesos");
          setLoading(false);
          return;
        }
      }

      toast.success("Cambios guardados correctamente");
setHasChanges(false);
if (onUpdated) await onUpdated();

    } catch (err: any) {
      console.error("[UserPermissionsTable] save error", err);
      setError(String(err?.message ?? err));
      toast.error("Error guardando cambios");
    } finally {
      setLoading(false);
    }
  };

  // ----- SEARCH / FILTER LOGIC -----
  const q = (search ?? "").trim().toLowerCase();
  const filteredProperties = React.useMemo(() => {
    if (!q) return properties;
    return properties.filter((p) => {
      const addr = String(p.address ?? "").toLowerCase();
      const id = String(p.id ?? "").toLowerCase();
      return addr.includes(q) || id.includes(q);
    });
  }, [properties, q]);

  // Highlight helper: returns JSX with matched substring wrapped in <mark>
  const highlightText = (
    text: string | undefined,
    query: string
  ): React.ReactNode => {
    const t = String(text ?? "");
    if (!query) return t;
    const lower = t.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return t;
    const before = t.slice(0, idx);
    const match = t.slice(idx, idx + query.length);
    const after = t.slice(idx + query.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200/60 rounded px-0.5">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-card to-card/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">
                  Permisos del usuario
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Gestiona los permisos y accesos de{" "}
                  <Badge variant="secondary" className="ml-1">
                    {displayName}
                  </Badge>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setLoadingOptions(true);
                  try {
                    const opts = await listAdminAvailableOptions();
                    const { av, resLabels, actLabels } =
                      deriveAvailableFromOptions(opts);
                    setAvailableActions(av);
                    setResourceLabels(resLabels);
                    setActionLabels(actLabels);
                    toast.success("Opciones recargadas");
                  } catch (err) {
                    console.error("refresh available options failed", err);
                    toast.error("Error recargando opciones");
                  } finally {
                    setLoadingOptions(false);
                  }
                }}
                disabled={loadingOptions}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingOptions ? "animate-spin" : ""}`}
                />
                Refrescar
              </Button>

           <Button
  onClick={handleSave}
  disabled={loading || loadingOptions || !hasChanges}
  className={`gap-2 ${hasChanges ? "bg-accent hover:bg-accent/90" : "bg-muted cursor-not-allowed"}`}
>
  <Save className="h-4 w-4" />
  {loading ? "Guardando..." : "Guardar cambios"}
</Button>

            </div>
          </div>
        </CardHeader>
      </Card>

      {loadingOptions ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Cargando opciones y permisos…</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="h-5 w-5" />
              <pre className="text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          </CardContent>
        </Card>
      ) : Object.keys(availableActions).length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No hay opciones de permisos disponibles.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Resource Permissions Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Shield className="h-5 w-5 text-black" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Permisos por recurso
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configura los permisos específicos para cada tipo de recurso
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(availableActions).map(([res, acts]) => (
                <div key={res} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-base capitalize">
                      {resourceLabels[res] ?? res}
                    </h4>
                    <Separator className="flex-1" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {acts.map((act) => {
                      const isChecked = Boolean(permissions[res]?.[act]);
                      return (
                        <div
                          key={act}
                          className={`
                            flex items-center justify-between p-3 rounded-lg border transition-all
                            ${
                              isChecked
                                ? "bg-accent/5 border-accent/20 shadow-sm"
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            {isChecked ? (
                              <CheckCircle2 className="h-4 w-4 text-accent" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium capitalize">
                              {actionLabels[act] ?? act}
                            </span>
                          </div>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleToggle(res, act, checked)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Los cambios se aplican con grant/revoke por resource/action
                  usando los endpoints administrativos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Property Access Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Building className="h-5 w-5  text-black" />
                </div>
                <div className="w-full">
  <div className="flex items-start md:items-center w-full gap-4">
    {/* IZQUIERDA: ocupa todo el espacio disponible */}
    <div className="flex-1 min-w-0">
      <CardTitle className="text-lg">Acceso a propiedades</CardTitle>
      <p className="text-sm text-muted-foreground mt-1">
        Gestiona el acceso específico a cada propiedad del sistema
      </p>
    </div>

    {/* DERECHA: input pegado al borde derecho */}
    <div
						className={`${highlightSearch ? "search-highlight search-pulse" : ""}flex-grow`}
						style={{ minWidth: 280 }}
					>
     <Input
  ref={searchRef}
  placeholder="Buscar..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="w-full md:max-w-3xl" // md: hasta ~768px (ajusta a md:max-w-4xl si quieres más)
  aria-label="Buscar"
/>

    </div>
  </div>
</div>

              </div>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      No se encontraron propiedades disponibles.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto">
                  {filteredProperties.map((p) => {
                    const sel = selectedProperties[p.id] ?? {
                      checked: false,
                      accessId: undefined,
                      accessType: "viewer",
                    };
                    return (
                      <div
                        key={p.id}
                        className={`
                          flex items-center justify-between p-4 rounded-lg border transition-all
                          ${
                            sel.checked
                              ? "bg-accent/5 border-accent/20 shadow-sm"
                              : "bg-card border-border hover:bg-muted/30"
                          }
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={Boolean(sel.checked)}
                            onCheckedChange={(checked) =>
                              toggleProperty(p.id, checked)
                            }
                          />
                          <div className="flex items-center gap-3">
                            {sel.checked ? (
                              <CheckCircle2 className="h-4 w-4 text-accent" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <span className="font-medium">#{p.id}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {highlightText(p.address, q)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Select
                          value={sel.accessType}
                          onValueChange={(value) =>
                            setPropertyAccessType(p.id, value)
                          }
                          disabled={!sel.checked}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Visor</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="full">Completo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                  {filteredProperties.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No se encontraron coincidencias.
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Marcar para otorgar, desmarcar para revocar. El tipo de acceso
                  se envía en la petición.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
