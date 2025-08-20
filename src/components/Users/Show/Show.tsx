// src/components/Users/Show/Show.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Shield, Building } from "lucide-react";
import type { User } from "../types";
import { listAdminAvailableOptions, listProperties } from "@/lib/services/permissions";
import { useI18n } from "@/i18n";

type UiPermissions = Record<string, Record<string, boolean>>;
type SelectedProperty = { checked: boolean; accessId?: number; accessType?: string };

const FALLBACK_ACTIONS: Record<string, string[]> = {
  guard: ["read", "update", "delete", "approve", "assign"],
  expense: ["create", "read", "update", "delete", "approve", "assign"],
  shift: ["create", "read", "update", "delete", "approve", "assign"],
  client: ["create", "read", "update", "delete", "approve", "assign"],
};

function deriveAvailableFromOptions(opts: any) {
  const av: Record<string, string[]> = {};
  const resLabels: Record<string, string> = {};
  const actLabels: Record<string, string> = {};

  if (!opts) {
    Object.entries(FALLBACK_ACTIONS).forEach(([res, acts]) => {
      av[res] = acts.slice();
      resLabels[res] = res;
    });
    return { av, resLabels, actLabels };
  }

  const resourcesArr = Array.isArray(opts.resource_types) ? opts.resource_types : [];
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
    Object.entries(FALLBACK_ACTIONS).forEach(([res, acts]) => {
      av[res] = acts.slice();
      resLabels[res] = res;
    });
  }

  return { av, resLabels, actLabels };
}

interface Props {
  user: User & {
    permissions?: any;
    resource_permissions?: any[];
    property_access?: any[];
    firstName?: string;
    lastName?: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export default function ShowUserDialog({ user, open, onClose }: Props) {
  const { TEXT } = useI18n();
  const U = TEXT as any;

  // helpers to read snake/camel and avoid TS complaints
  const readUserBool = (u: any, snake: string, camel: string, fallback = false): boolean => {
    if (!u) return fallback;
    if (u[snake] !== undefined) return Boolean(u[snake]);
    if (u[camel] !== undefined) return Boolean(u[camel]);
    return fallback;
  };

  /* const getUserProp = (u: any, ...keys: string[]) => {
    if (!u) return undefined;
    for (const k of keys) {
      if (u[k] !== undefined) return u[k];
    }
    return undefined;
  }; */

  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({});
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({});
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({});
  const [permissions, setPermissions] = React.useState<UiPermissions>({});
  const permissionIdMapRef = React.useRef<Record<string, number | null>>({});
  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([]);
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, SelectedProperty>>({});

  const [, setLoadingOptions] = React.useState(false);
  const [loadingPermissions, setLoadingPermissions] = React.useState(false);

  // search + highlight for properties
  const [search, setSearch] = React.useState<string>("");
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      setLoadingOptions(true);
      setLoadingPermissions(true);
      permissionIdMapRef.current = {};
      setPermissions({});
      setAvailableActions({});
      setResourceLabels({});
      setActionLabels({});
      setSelectedProperties({});
      setProperties([]);

      try {
        const [optsRes, propsRes] = await Promise.allSettled([listAdminAvailableOptions(), listProperties({ page_size: 200 })]);
        if (!mounted) return;

        const optsVal = optsRes.status === "fulfilled" ? optsRes.value : null;
        const propsVal = propsRes.status === "fulfilled" ? propsRes.value : null;

        const { av, resLabels, actLabels } = deriveAvailableFromOptions(optsVal);
        setAvailableActions(av);
        setResourceLabels(resLabels);
        setActionLabels(actLabels);

        // --- build initial permission booleans from user data (defensive) ---
        const initialPermBooleans: UiPermissions = {};
        const anyUser = user as any;

        // prefer array of resource_permissions objects
        if (Array.isArray(anyUser.resource_permissions) && anyUser.resource_permissions.length > 0) {
          anyUser.resource_permissions.forEach((rp: any) => {
            const resource = String(rp.resource_type ?? rp.resource ?? "").toLowerCase();
            const action = String(rp.action ?? "").toLowerCase();
            if (!resource) return;
            permissionIdMapRef.current[`${resource}.${action}`] = Number(rp.id ?? rp.permission_id ?? rp.pk ?? null) || null;
            initialPermBooleans[resource] = initialPermBooleans[resource] ?? {};
            initialPermBooleans[resource][action] = true;
          });
        } else {
          // fallback: user.permissions (can be object or array)
          const permsSrc = anyUser.permissions ?? anyUser.resource_permissions ?? null;
          if (permsSrc) {
            if (!Array.isArray(permsSrc) && typeof permsSrc === "object") {
              for (const [sec, obj] of Object.entries(permsSrc)) {
                const s = String(sec).toLowerCase();
                initialPermBooleans[s] = initialPermBooleans[s] ?? {};
                if (obj && typeof obj === "object") {
                  for (const [k, v] of Object.entries(obj as any)) {
                    initialPermBooleans[s][String(k).toLowerCase()] = Boolean(v);
                  }
                }
              }
            } else if (Array.isArray(permsSrc)) {
              permsSrc.forEach((it: any) => {
                if (typeof it === "string" && it.includes(".")) {
                  const [s, a] = it.split(".");
                  initialPermBooleans[s] = initialPermBooleans[s] ?? {};
                  initialPermBooleans[s][a] = true;
                } else if (it && typeof it === "object") {
                  const codename = it.codename || it.permission || "";
                  if (typeof codename === "string" && codename.includes(".")) {
                    const [s, a] = codename.split(".");
                    initialPermBooleans[s] = initialPermBooleans[s] ?? {};
                    initialPermBooleans[s][a] = true;
                  }
                }
              });
            }
          }
        }

        // seed UI permissions from available actions
        const seed: UiPermissions = {};
        for (const [resKey, acts] of Object.entries(av)) {
          seed[resKey] = {};
          acts.forEach((a) => {
            seed[resKey][a] = Boolean(initialPermBooleans[resKey]?.[a] ?? false);
          });
        }
        setPermissions(seed);

        // --- build property access map defensively ---
        const initialPropMap: Record<number, SelectedProperty> = {};
        // primary source: property_access array objects
        if (Array.isArray(anyUser.property_access) && anyUser.property_access.length > 0) {
          anyUser.property_access.forEach((pa: any) => {
            const pid = Number(pa.property_id ?? pa.property ?? pa.propertyId ?? Number.NaN);
            if (Number.isNaN(pid)) return;
            initialPropMap[pid] = {
              checked: true,
              accessId: Number(pa.id ?? pa.access_id ?? pa.pk ?? null) || undefined,
              accessType: String(pa.access_type ?? pa.accessType ?? "viewer"),
            };
          });
        } else {
          // fallback: accessible_properties (array of ids or objects) OR property_ids
          const acc = anyUser.accessible_properties ?? anyUser.property_ids ?? anyUser.accessibleProperties ?? null;
          if (Array.isArray(acc)) {
            acc.forEach((p: any) => {
              const pid = Number(p?.id ?? p ?? Number.NaN);
              if (Number.isNaN(pid)) return;
              initialPropMap[pid] = {
                checked: true,
                accessType: "viewer",
              };
            });
          }
        }

        setSelectedProperties(initialPropMap);

        const items = Array.isArray(propsVal) ? propsVal : propsVal?.results ?? [];
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }));
        setProperties(simple);
      } catch (err: any) {
        console.error("[ShowUserDialog] load error", err);
      } finally {
        if (mounted) {
          setLoadingOptions(false);
          setLoadingPermissions(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [user]);

  // filter properties with search
  const q = (search ?? "").trim().toLowerCase();
  const filteredProperties = React.useMemo(() => {
    if (!q) return properties;
    return properties.filter((p) => {
      const addr = String(p.address ?? "").toLowerCase();
      const id = String(p.id ?? "").toLowerCase();
      return addr.includes(q) || id.includes(q);
    });
  }, [properties, q]);

  const highlightText = (text: string | undefined, query: string): React.ReactNode => {
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

  const displayFirst = (u?: any) => u?.firstName ?? u?.first_name ?? (u?.name ? String(u.name).split(" ").slice(0, -1).join(" ") : "");
  const displayLast = (u?: any) => u?.lastName ?? u?.last_name ?? (u?.name ? String(u.name).split(" ").pop() : "");

  // read boolean fields using helper to support both snake/camel
  const isActiveVal = readUserBool(user as any, "is_active", "isActive", true);
  const isStaffVal = readUserBool(user as any, "is_staff", "isStaff", false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[90vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{U?.users?.titleShow ?? U?.users?.editTitle ?? "Ver Usuario"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-3 max-h-[82vh] overflow-auto">
          {/* Basic info grid — read-only inputs */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{U?.users?.table?.headers?.username ?? "Usuario"}</label>
              <Input value={(user as any)?.username ?? ""} disabled className="py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{U?.users?.table?.headers?.firstName ?? "Nombre"}</label>
              <Input value={displayFirst(user as any)} disabled className="py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{U?.users?.table?.headers?.lastName ?? "Apellido"}</label>
              <Input value={displayLast(user as any)} disabled className="py-2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{U?.users?.table?.headers?.email ?? "Correo"}</label>
            <Input value={(user as any)?.email ?? ""} disabled className="py-2" />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch checked={isActiveVal} disabled />
              <span className="text-sm">{U?.users?.activeLabel ?? "Activo"}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch checked={isStaffVal} disabled />
              <span className="text-sm">{U?.users?.staffLabel ?? "Staff"}</span>
            </label>
          </div>

          {/* Permissions card (read-only switches) */}
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-accent/10 rounded-md">
                  <Shield className="h-4 w-4 text-black" />
                </div>
                <div>
                  <CardTitle className="text-sm">{U?.users?.permissionsTitle ?? "Permisos por recurso"}</CardTitle>
                  <p className="text-xs text-muted-foreground">{U?.users?.selectPrompt ?? ""}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-3 py-2">
              {loadingPermissions ? (
                <div className="text-xs text-muted-foreground">Cargando opciones de permisos…</div>
              ) : Object.keys(availableActions).length === 0 ? (
                <div className="text-xs text-muted-foreground">No hay opciones de permisos disponibles.</div>
              ) : (
                Object.entries(availableActions).map(([res, acts]) => (
                  <div key={res} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm capitalize">{resourceLabels[res] ?? res}</h4>
                      <Separator className="flex-1" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {acts.map((act) => {
                        const isChecked = Boolean(permissions[res]?.[act]);
                        return (
                          <div
                            key={act}
                            className={`
                              flex items-center justify-between px-2 py-1 rounded-md border transition-all
                              ${isChecked ? "bg-accent/5 border-accent/20 shadow-sm" : "bg-muted/10 border-border"}
                            `}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isChecked ? <CheckCircle2 className="h-3 w-3 text-accent" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}

                              <div className="min-w-0">
                                <span className="text-xs font-medium capitalize break-words whitespace-normal">
                                  {actionLabels[act] ?? act}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 ml-2">
                              <Switch checked={isChecked} disabled />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              <div className="mt-1 p-2 bg-muted/10 rounded-md">
                <p className="text-[11px] text-muted-foreground">{U?.users?.permissionsHelp ?? "Los permisos se muestran en modo lectura."}</p>
              </div>
            </CardContent>
          </Card>

          {/* Properties card (read-only) */}
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-2 w-full">
                <div className="p-1 bg-accent/10 rounded-md">
                  <Building className="h-4 w-4 text-black" />
                </div>

                <div className="w-full">
                  <div className="flex items-start md:items-center w-full gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{U?.properties?.title ?? "Acceso a propiedades"}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{U?.properties?.table?.searchPlaceholder ?? ""}</p>
                    </div>

                    <div className={`${highlightSearch ? "search-highlight search-pulse" : ""} flex-grow`} style={{ minWidth: 220 }}>
                      <Input
                        ref={searchRef}
                        placeholder={U?.properties?.table?.searchPlaceholder ?? "Buscar..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full py-2"
                        aria-label={U?.properties?.table?.searchPlaceholder ?? "Buscar..."}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-3 py-2">
              {properties.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center text-muted-foreground">
                    <Building className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{U?.properties?.table?.title ?? "Propiedades"}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-auto">
                  {filteredProperties.map((p) => {
                    const sel = selectedProperties[p.id] ?? { checked: false, accessId: undefined, accessType: "viewer" };
                    return (
                      <div
                        key={p.id}
                        className={`
                          flex items-center justify-between px-3 py-2 rounded-md border transition-all
                          ${sel.checked ? "bg-accent/5 border-accent/20 shadow-sm" : "bg-card border-border"}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Switch checked={Boolean(sel.checked)} disabled />
                          <div className="flex items-center gap-2">
                            {sel.checked ? <CheckCircle2 className="h-3 w-3 text-accent" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
                            <div className="min-w-0">
                              <span className="font-medium text-xs">#{p.id}</span>
                              <div className="text-[11px] text-muted-foreground ml-1 truncate" style={{ maxWidth: 240 }}>
                                {highlightText(p.address, q)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Select value={sel.accessType} disabled>
                          <SelectTrigger className="w-28 text-xs py-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">{U?.properties?.form?.fields?.viewer ?? "Visor"}</SelectItem>
                            <SelectItem value="editor">{U?.properties?.form?.fields?.editor ?? "Editor"}</SelectItem>
                            <SelectItem value="admin">{U?.properties?.form?.fields?.admin ?? "Admin"}</SelectItem>
                            <SelectItem value="full">{U?.properties?.form?.fields?.full ?? "Completo"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                  {filteredProperties.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No se encontraron coincidencias.</div>}
                </div>
              )}

              <div className="mt-3 p-2 bg-muted/10 rounded-md">
                <p className="text-[11px] text-muted-foreground">{U?.properties?.help ?? "Accesos a propiedades (solo lectura)."}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end items-center pt-1 gap-2">
            <Button variant="secondary" onClick={() => onClose()} className="py-1 px-2 text-sm">
              {U?.actions?.cancel ?? "Cerrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
