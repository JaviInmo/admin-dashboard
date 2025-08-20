// src/components/EditUserDialog.tsx
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
import { toast } from "sonner";
import type { User } from "../types";
import { updateUser } from "@/lib/services/users";
import {
  listAdminAvailableOptions,
  listUsersWithPermissions,
  listProperties,
  grantResourcePermission,
  revokeResourcePermissionById,
  grantPropertyAccess,
  revokePropertyAccessById,
} from "@/lib/services/permissions";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  
  Shield,
  Building,
} from "lucide-react";
import { useI18n } from "@/i18n";

type UiPermissions = Record<string, Record<string, boolean>>;

interface Props {
  user: User & {
    permissions?: any;
    properties?: number[];
    property_access?: any[];
    accessible_properties?: number[];
    property_ids?: number[];
  };
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

type SelectedProperty = { checked: boolean; accessId?: number; accessType?: string };

const FALLBACK_ACTIONS = {
  guard: ["read", "update", "delete", "approve", "assign"],
  expense: ["create", "read", "update", "delete", "approve", "assign"],
  shift: ["create", "read", "update", "delete", "approve", "assign"],
  client: ["create", "read", "update", "delete", "approve", "assign"],
};

export default function EditUserDialog({ user, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();
  // safe local alias to avoid TS 'never' issues when accessing nested props
  // (keeps your i18n file unchanged)
  const U = TEXT as any;

  // --- basic user fields ---
  const splitName = (name?: string) => {
    const parts = name?.trim().split(" ").filter(Boolean) ?? [];
    return {
      first: parts.slice(0, -1).join(" ") || parts[0] || "",
      last: parts.length > 1 ? parts[parts.length - 1] : "",
    };
  };

  const initialFirst = (user as any).firstName ?? splitName((user as any).name ?? user.username).first;
  const initialLast = (user as any).lastName ?? splitName((user as any).name ?? user.username).last;

  const [username] = React.useState<string>(user.username ?? "");
  const [firstName, setFirstName] = React.useState<string>(initialFirst ?? "");
  const [lastName, setLastName] = React.useState<string>(initialLast ?? "");
  const [email, setEmail] = React.useState<string>(user.email ?? "");
  const readUserBool = (snake: string, camel: string, fallback = true): boolean => {
    const anyUser = user as any;
    if (anyUser[snake] !== undefined) return Boolean(anyUser[snake]);
    if (anyUser[camel] !== undefined) return Boolean(anyUser[camel]);
    return fallback;
  };
  const [isActive, setIsActive] = React.useState<boolean>(readUserBool("is_active", "isActive", true));
  const [isStaff, setIsStaff] = React.useState<boolean>(readUserBool("is_staff", "isStaff", false));

  // --- permissions & props UI state ---
  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({});
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({});
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({});
  const [permissions, setPermissions] = React.useState<UiPermissions>({});
  const permissionIdMapRef = React.useRef<Record<string, number | null>>({});
  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([]);
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, SelectedProperty>>({});

  // loading / error / changes
  const [loading, setLoading] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [loadingPermissions] = React.useState(false);
/*     const [loadingPermissions, setIsLoadingPermissions] = React.useState(false); */
  const [error, setError] = React.useState<string | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  // search + highlight
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

  // deriveAvailableFromOptions
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

  // initial load: options + users + properties
  React.useEffect(() => {
    if (!user || !user.id) return;
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
        const usersVal = usersRes.status === "fulfilled" ? usersRes.value : null;
        const propsVal = propsRes.status === "fulfilled" ? propsRes.value : null;

        const { av, resLabels, actLabels } = deriveAvailableFromOptions(optsVal);
        setAvailableActions(av);
        setResourceLabels(resLabels);
        setActionLabels(actLabels);

        const initialPermBooleans: UiPermissions = {};
        const initialPropMap: Record<number, SelectedProperty> = {};

        if (usersVal && Array.isArray((usersVal as any).users)) {
          const found = (usersVal as any).users.find((u: any) => Number(u.id) === Number(user.id));
          if (found) {
            if (Array.isArray(found.resource_permissions)) {
              found.resource_permissions.forEach((rp: any) => {
                const resource = String(rp.resource_type ?? rp.resource ?? "").toLowerCase();
                const action = String(rp.action ?? "").toLowerCase();
                if (!resource) return;
                permissionIdMapRef.current[`${resource}.${action}`] = Number(rp.id ?? rp.permission_id ?? rp.pk ?? null) || null;
                initialPermBooleans[resource] = initialPermBooleans[resource] ?? {};
                initialPermBooleans[resource][action] = true;
              });
            }

            if (Array.isArray(found.property_access)) {
              found.property_access.forEach((pa: any) => {
                const pid = Number(pa.property_id ?? pa.property ?? pa.propertyId ?? Number.NaN);
                if (Number.isNaN(pid)) return;
                initialPropMap[pid] = {
                  checked: true,
                  accessId: Number(pa.id ?? pa.access_id ?? pa.pk ?? null) || undefined,
                  accessType: String(pa.access_type ?? pa.accessType ?? "viewer"),
                };
              });
            }
          }
        }

        // fallback: if user object contains permissions inlined
        if (Object.keys(initialPermBooleans).length === 0) {
          const permsSrc = (user as any).permissions ?? (user as any).resource_permissions ?? null;
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

        const seed: UiPermissions = {};
        for (const [resKey, acts] of Object.entries(av)) {
          seed[resKey] = {};
          acts.forEach((a) => {
            seed[resKey][a] = Boolean(initialPermBooleans[resKey]?.[a] ?? false);
          });
        }

        setPermissions(seed);
        setSelectedProperties(initialPropMap);

        const items = Array.isArray(propsVal) ? propsVal : propsVal?.results ?? [];
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }));
        setProperties(simple);
      } catch (err: any) {
        console.error("[EditUserDialog] load error", err);
        setError(U?.users?.loading ?? "Error cargando permisos/usuario");
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [user, U?.users?.loading]);

  // toggle handlers
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
      [id]: { checked, accessId: prev?.[id]?.accessId, accessType: prev?.[id]?.accessType ?? "viewer" },
    }));
    setHasChanges(true);
  };

  const setPropertyAccessType = (id: number, type: string) => {
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked: prev?.[id]?.checked ?? false, accessId: prev?.[id]?.accessId, accessType: type },
    }));
    setHasChanges(true);
  };

  // when user fields change -> mark hasChanges
  React.useEffect(() => {
    const originalFirst = (user as any).firstName ?? splitName((user as any).name ?? user.username).first;
    const originalLast = (user as any).lastName ?? splitName((user as any).name ?? user.username).last;
    const originalEmail = user.email ?? "";
    const originalActive = readUserBool("is_active", "isActive", true);
    const originalStaff = readUserBool("is_staff", "isStaff", false);

    if (
      firstName !== (originalFirst ?? "") ||
      lastName !== (originalLast ?? "") ||
      email !== (originalEmail ?? "") ||
      isActive !== originalActive ||
      isStaff !== originalStaff
    ) {
      setHasChanges(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, email, isActive, isStaff]);

  // search/filter logic
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

  // --- SAVE logic ---
  const handleSaveAll = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) update basic user info
      const payload: Record<string, any> = {
        email: email?.trim() ?? null,
        first_name: firstName?.trim() ?? "",
        last_name: lastName?.trim() ?? "",
        is_active: !!isActive,
        is_staff: !!isStaff,
      };
      await updateUser(user.id, payload);

      // 2) compute resource grants & revoke ids
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

      // grants
      for (const g of toGrant) {
        try {
          const r = await grantResourcePermission(user.id, g.resource, g.action, `Granted from UI`);
          const createdId = Number(r?.id ?? r?.permission_id ?? r?.pk ?? null);
          if (createdId) permissionIdMapRef.current[`${g.resource}.${g.action}`] = createdId;
        } catch (err: any) {
          console.error("grantResourcePermission failed", err);
          setError(U?.users?.saveChanges ?? "Error otorgando permisos");
          toast.error(U?.users?.saveChanges ?? "Error otorgando permisos");
          setLoading(false);
          return;
        }
      }

      // revokes
      for (const pid of toRevokeIds) {
        try {
          await revokeResourcePermissionById(pid, `Revoked from UI`);
          for (const k of Object.keys(permissionIdMapRef.current)) {
            if (permissionIdMapRef.current[k] === pid) permissionIdMapRef.current[k] = null;
          }
        } catch (err: any) {
          console.error("revokeResourcePermissionById failed", err);
          setError(U?.users?.saveChanges ?? "Error revocando permisos");
          toast.error(U?.users?.saveChanges ?? "Error revocando permisos");
          setLoading(false);
          return;
        }
      }

      // 3) properties: grants, updates, revokes
      const grants: Array<{ propertyId: number; accessType: string }> = [];
      const revokes: number[] = [];
      const updates: Array<{ accessId: number; propertyId: number; accessType: string }> = [];

      for (const [pidStr, val] of Object.entries(selectedProperties)) {
        const pid = Number(pidStr);
        if (val.checked && !val.accessId) {
          grants.push({ propertyId: pid, accessType: val.accessType ?? "viewer" });
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
          const r = await grantPropertyAccess(user.id, g.propertyId, g.accessType, undefined, `Granted from UI`);
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
          setError(U?.users?.saveChanges ?? "Error otorgando accesos a propiedades");
          toast.error(U?.users?.saveChanges ?? "Error en accesos a propiedades");
          setLoading(false);
          return;
        }
      }

      for (const u of updates) {
        try {
          await grantPropertyAccess(user.id, u.propertyId, u.accessType, undefined, `Updated from UI`);
        } catch (err: any) {
          console.error("update property access failed", err);
          setError(U?.users?.saveChanges ?? "Error actualizando accesos");
          toast.error(U?.users?.saveChanges ?? "Error actualizando accesos");
          setLoading(false);
          return;
        }
      }

      for (const aid of revokes) {
        try {
          await revokePropertyAccessById(aid, `Revoked from UI`);
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
          setError(U?.users?.saveChanges ?? "Error revocando accesos");
          toast.error(U?.users?.saveChanges ?? "Error revocando accesos");
          setLoading(false);
          return;
        }
      }

      toast.success(U?.users?.saveChanges ?? U?.actions?.save ?? "Guardado");
      setHasChanges(false);
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      console.error("[EditUserDialog] save error", err);
      setError(String(err?.message ?? err));
      toast.error(U?.users?.saveChanges ?? U?.actions?.save ?? "Error guardando cambios");
    } finally {
      setLoading(false);
    }
  };

  // compute dialog title with safe fallbacks
  const dialogTitle = U?.users?.editTitle ?? U?.users?.title ?? "Editar Usuario";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[90vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-3 max-h-[82vh] overflow-auto">
          {/* Basic info grid con labels */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="username-input" className="text-xs font-medium text-muted-foreground block mb-1">
                { (U?.users?.table?.headers?.username) ?? "Usuario" }
              </label>
              <Input id="username-input" placeholder={ (U?.users?.table?.headers?.username) ?? "Usuario" } value={username} disabled className="py-2" />
            </div>

            <div>
              <label htmlFor="first-name-input" className="text-xs font-medium text-muted-foreground block mb-1">
                { (U?.users?.table?.headers?.firstName) ?? "Nombre" }
              </label>
              <Input id="first-name-input" placeholder={ (U?.users?.table?.headers?.firstName) ?? "Nombre" } value={firstName} onChange={(e) => setFirstName(e.target.value)} className="py-2" />
            </div>

            <div>
              <label htmlFor="last-name-input" className="text-xs font-medium text-muted-foreground block mb-1">
                { (U?.users?.table?.headers?.lastName) ?? "Apellido" }
              </label>
              <Input id="last-name-input" placeholder={ (U?.users?.table?.headers?.lastName) ?? "Apellido" } value={lastName} onChange={(e) => setLastName(e.target.value)} className="py-2" />
            </div>
          </div>

          <div>
            <label htmlFor="email-input" className="text-xs font-medium text-muted-foreground block mb-1">
              { (U?.users?.table?.headers?.email) ?? "Correo" }
            </label>
            <Input id="email-input" placeholder={ (U?.users?.table?.headers?.email) ?? "Correo" } value={email} onChange={(e) => setEmail(e.target.value)} className="py-2" />
          </div>

          <div className="flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span className="text-sm">{ U?.users?.activeLabel ?? "Activo" }</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isStaff} onChange={(e) => setIsStaff(e.target.checked)} />
              <span className="text-sm">{ U?.users?.staffLabel ?? "Staff" }</span>
            </label>
          </div>

          {/* Header actions: Refresh options + Save */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setLoadingOptions(true);
                try {
                  const opts = await listAdminAvailableOptions();
                  const { av, resLabels, actLabels } = deriveAvailableFromOptions(opts);
                  setAvailableActions(av);
                  setResourceLabels(resLabels);
                  setActionLabels(actLabels);
                  toast.success(U?.actions?.refresh ?? "Refrescar");
                } catch (err) {
                  console.error("refresh available options failed", err);
                  toast.error(U?.actions?.refresh ?? "Error recargando opciones");
                } finally {
                  setLoadingOptions(false);
                }
              }}
              disabled={loadingOptions}
              className="gap-2 py-1 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingOptions ? "animate-spin" : ""}`} />
              {U?.actions?.refresh ?? "Refrescar"}
            </Button>

            
          </div>

          {/* Permisos card */}
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-accent/10 rounded-md">
                  <Shield className="h-4 w-4 text-black" />
                </div>
                <div>
                  <CardTitle className="text-sm">{ U?.users?.permissionsTitle ?? "Permisos por recurso" }</CardTitle>
                  <p className="text-xs text-muted-foreground">{ U?.users?.selectPrompt ?? "" }</p>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2">
                      {acts.map((act) => {
                        const isChecked = Boolean(permissions[res]?.[act]);
                        return (
                          <div
                            key={act}
                            className={`
                              flex items-center justify-between px-2 py-1 rounded-md border transition-all
                              ${isChecked ? "bg-accent/5 border-accent/20 shadow-sm" : "bg-muted/10 border-border hover:bg-muted/20"}
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
                              <Switch
                                checked={isChecked}
                                onCheckedChange={(checked: boolean) => handleToggle(res, act, checked)}
                                className="transform scale-75"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              <div className="mt-1 p-2 bg-muted/10 rounded-md">
                <p className="text-[11px] text-muted-foreground">{ U?.users?.permissionsHelp ?? "Los permisos se aplican con grant/revoke por resource/action." }</p>
              </div>
            </CardContent>
          </Card>

          {/* Properties card */}
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-2 w-full">
                <div className="p-1 bg-accent/10 rounded-md">
                  <Building className="h-4 w-4 text-black" />
                </div>

                <div className="w-full">
                  <div className="flex items-start md:items-center w-full gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{ U?.properties?.title ?? "Acceso a propiedades" }</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{ U?.properties?.table?.searchPlaceholder ?? "Buscar..." }</p>
                    </div>

                    <div className={`${highlightSearch ? "search-highlight search-pulse" : ""} flex-grow`} style={{ minWidth: 220 }}>
                      <Input
                        ref={searchRef}
                        placeholder={ U?.properties?.table?.searchPlaceholder ?? "Buscar..." }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full py-2"
                        aria-label={ U?.properties?.table?.searchPlaceholder ?? "Buscar..." }
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
                    <p className="text-xs">{ U?.properties?.table?.title ?? "Propiedades" }</p>
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
                          ${sel.checked ? "bg-accent/5 border-accent/20 shadow-sm" : "bg-card border-border hover:bg-muted/10"}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={Boolean(sel.checked)}
                            onCheckedChange={(checked: boolean) => toggleProperty(p.id, checked)}
                            className="transform scale-75"
                          />
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

                        <Select value={sel.accessType} onValueChange={(value: string) => setPropertyAccessType(p.id, value)} disabled={!sel.checked}>
                          <SelectTrigger className="w-28 text-xs py-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">{ U?.properties?.form?.fields?.viewer ?? "Visor" }</SelectItem>
                            <SelectItem value="editor">{ U?.properties?.form?.fields?.editor ?? "Editor" }</SelectItem>
                            <SelectItem value="admin">{ U?.properties?.form?.fields?.admin ?? "Admin" }</SelectItem>
                            <SelectItem value="full">{ U?.properties?.form?.fields?.full ?? "Completo" }</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                  {filteredProperties.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No matches.</div>}
                </div>
              )}

              <div className="mt-3 p-2 bg-muted/10 rounded-md">
                <p className="text-[11px] text-muted-foreground">{ U?.properties?.help ?? "Marcar para otorgar, desmarcar para revocar." }</p>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end items-center pt-1 gap-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading} className="py-1 px-2 text-sm">
              { U?.actions?.cancel ?? "Cancelar" }
            </Button>
            <Button onClick={handleSaveAll} className="ml-1 py-1 px-3 text-sm" disabled={loading || !hasChanges}>
              {loading ? `${U?.actions?.save ?? "Guardar"}...` : (U?.users?.saveChanges ?? U?.actions?.save ?? "Guardar")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
