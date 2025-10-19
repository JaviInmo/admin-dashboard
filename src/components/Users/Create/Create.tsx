// src/components/Users/CreateUserDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
import {
  createUser,
  type CreateUserPayload
} from "@/lib/services/users";
import {
  listAdminAvailableOptions,
  listProperties,
  assignUserPermissions,
  grantPropertyAccess,
} from "@/lib/services/permissions";
import { CheckCircle2, XCircle, Shield, Building } from "lucide-react";
import { useI18n } from "@/i18n";

type UiPermissions = Record<string, Record<string, boolean>>;
type SelectedProperty = { checked: boolean; accessType?: string };

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

const uiPermissionsToCodenames = (ui: UiPermissions) => {
  const c: string[] = [];
  for (const [res, actions] of Object.entries(ui)) {
    for (const [act, en] of Object.entries(actions)) {
      if (!en) continue;
      c.push(`${res.toLowerCase()}.${act.toLowerCase()}`);
    }
  }
  return c;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

export default function CreateUserDialog({ open, onClose, onCreated }: Props) {
  const { TEXT } = useI18n();

  function getText(path: string, fallback?: string, vars?: Record<string, string>) {
    const parts = path.split(".");
    let val: any = TEXT;
    for (const p of parts) {
      val = val?.[p];
      if (val == null) break;
    }
    let str = typeof val === "string" ? val : fallback ?? path;
    if (vars && typeof str === "string") {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      }
    }
    return String(str);
  }

  // For backward compatibility in a few places use U = TEXT
/*   const U = TEXT as any; */

  const [username, setUsername] = React.useState<string>("");
  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [isStaff, setIsStaff] = React.useState<boolean>(false);

  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({});
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({});
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({});
  const [permissions, setPermissions] = React.useState<UiPermissions>({});

  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([]);
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, SelectedProperty>>({});

  const [loading, setLoading] = React.useState<boolean>(false);
  const [loadingOptions, setLoadingOptions] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // search + highlight for properties
  const [search, setSearch] = React.useState<string>("");
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {
        // Ignore focus errors (element might not be available)
      }
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

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

  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function resetForm() {
    setUsername("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setIsActive(true);
    setIsStaff(false);
    setPermissions((prev) => {
      const seed: UiPermissions = {};
      for (const [res, acts] of Object.entries(prev ?? {})) {
        seed[res] = {};
        for (const a of Object.keys(acts)) seed[res][a] = false;
      }
      return seed;
    });
    setSelectedProperties({});
    setError(null);
    setSearch("");
    setHighlightSearch(true);
  }

  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    const load = async () => {
      setLoadingOptions(true);
      setError(null);
      try {
        const [optsRes, propsRes] = await Promise.allSettled([listAdminAvailableOptions(), listProperties({ page_size: 200 })]);
        if (!mounted) return;

        const optsVal = optsRes.status === "fulfilled" ? optsRes.value : null;
        const propsVal = propsRes.status === "fulfilled" ? propsRes.value : null;

        const { av, resLabels, actLabels } = deriveAvailableFromOptions(optsVal);
        setAvailableActions(av);
        setResourceLabels(resLabels);
        setActionLabels(actLabels);

        const seed: UiPermissions = {};
        Object.entries(av).forEach(([res, acts]) => {
          seed[res] = {};
          acts.forEach((a) => {
            seed[res][a] = false;
          });
        });
        setPermissions(seed);

        const items = Array.isArray(propsVal) ? propsVal : propsVal?.results ?? [];
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }));
        setProperties(simple);
        setSelectedProperties({});
      } catch (err: unknown) {
        console.error("[CreateUserDialog] load options error", err);
        setAvailableActions(FALLBACK_ACTIONS as any);
        const seed: UiPermissions = {};
        Object.entries(FALLBACK_ACTIONS).forEach(([r, acts]) => {
          seed[r] = {};
          acts.forEach((a) => {
            seed[r][a] = false;
          });
        });
        setPermissions(seed);
        setProperties([]);
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleToggle = (resource: string, action: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [resource]: {
        ...(prev?.[resource] ?? {}),
        [action]: checked,
      },
    }));
  };

  const toggleProperty = (id: number, checked: boolean) => {
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked, accessType: prev?.[id]?.accessType ?? "viewer" },
    }));
  };

  const setPropertyAccessType = (id: number, type: string) => {
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked: prev?.[id]?.checked ?? false, accessType: type },
    }));
  };

  function validate(): string | null {
    // prefer users.form.validation keys if present, fallback to common messages
    const vU = (TEXT.users as any)?.form?.validation ?? {};
    if (!username.trim()) return vU.usernameRequired ?? getText("users.form.validation.usernameRequired", "Usuario es requerido");
    if (!firstName.trim()) return vU.firstNameRequired ?? getText("users.form.validation.firstNameRequired", "Nombre es requerido");
    if (!lastName.trim()) return vU.lastNameRequired ?? getText("users.form.validation.lastNameRequired", "Apellido es requerido");
    if (!email.trim()) return vU.emailRequired ?? getText("users.form.validation.emailRequired", "Email es requerido");
    if (email && !/\S+@\S+\.\S+/.test(email)) return vU.emailInvalid ?? getText("users.form.validation.emailInvalid", "Email inválido");
    if (!password) return vU.passwordRequired ?? getText("users.form.validation.passwordRequired", "Contraseña es requerida");
    if (password.length < 6) return vU.passwordMin ?? getText("users.form.validation.passwordMin", "La contraseña debe tener al menos 6 caracteres");
    if (password !== passwordConfirm) return vU.passwordMatch ?? getText("users.form.validation.passwordMatch", "Las contraseñas no coinciden");
    return null;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      toast.error(v);
      return;
    }

    setLoading(true);
    try {
      const payload: CreateUserPayload = {
        username: username.trim(),
        email: email.trim() !== "" ? email.trim() : undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        password_confirm: passwordConfirm,
        is_active: !!isActive,
        is_staff: !!isStaff,
      };

      const created = await createUser(payload);

      const codenames = uiPermissionsToCodenames(permissions);
      if (codenames.length > 0) {
        try {
          await assignUserPermissions(created.id, codenames);
        } catch (errAssign: any) {
          console.error("Error assigning permissions on create:", errAssign);
          toast.error(getText("users.create.permissionAssignError", "Some permissions couldn't be assigned (see console)"));
        }
      }

      const toGrant = Object.entries(selectedProperties)
        .filter(([_, v]) => (v as SelectedProperty).checked)
        .map(([k, v]) => ({ id: Number(k), access: v.accessType ?? "viewer" }));

      for (const g of toGrant) {
        try {
          await grantPropertyAccess(created.id, g.id, g.access);
        } catch (errGrant: any) {
          console.error("Error granting property access", g, errGrant);
          toast.error(getText("properties.grantError", "Could not grant access to property") + ` #${g.id}`);
        }
      }

      toast.success(getText("users.form.createSuccess", "User created"));
      if (mountedRef.current) {
        if (onCreated) await onCreated();
        onClose();
      }
    } catch (err: any) {
      console.error("[CreateUserDialog] submit error", err);
      const data = err?.response?.data ?? err?.message ?? String(err);
      const msg = typeof data === "object" ? JSON.stringify(data) : String(data);
      setError(msg);
      toast.error(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // New helpers to localize resource/action labels:
  const getResourceLabel = (resKey: string) => {
    // Preference order: permissions.resources.<res>.label -> resourceLabels (server) -> raw key capitalized
    const txt = getText(`permissions.resources.${resKey}.label`, "");
    if (txt && !txt.startsWith("permissions.resources.")) return txt;
    if (resourceLabels[resKey]) return resourceLabels[resKey];
    // fallback: prettify key
    return resKey.charAt(0).toUpperCase() + resKey.slice(1);
  };

  const getActionLabel = (resKey: string, actKey: string) => {
    // Priority:
    // 1) permissions.actions.<res>.<action>
    // 2) permissions.actions.<action>
    // 3) actionLabels[actKey] (server-provided)
    // 4) prettified actKey
    const byRes = getText(`permissions.actions.${resKey}.${actKey}`, "");
    if (byRes && !byRes.startsWith("permissions.actions.")) return byRes;

    const byAct = getText(`permissions.actions.${actKey}`, "");
    if (byAct && !byAct.startsWith("permissions.actions.")) return byAct;

    if (actionLabels[actKey]) return actionLabels[actKey];
    // prettify fallback
    return actKey.charAt(0).toUpperCase() + actKey.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[90vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{getText("users.form.createTitle", "Crear Usuario")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-3 max-h-[82vh] overflow-auto">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{getText("users.table.headers.username", "Usuario")}</label>
              <Input placeholder={getText("users.table.headers.username", "Usuario")} value={username} onChange={(e) => setUsername(e.target.value)} className="py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{getText("users.table.headers.firstName", "Nombre")}</label>
              <Input placeholder={getText("users.table.headers.firstName", "Nombre")} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{getText("users.table.headers.lastName", "Apellido")}</label>
              <Input placeholder={getText("users.table.headers.lastName", "Apellido")} value={lastName} onChange={(e) => setLastName(e.target.value)} className="py-2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{getText("users.table.headers.email", "Correo")}</label>
            <Input placeholder={getText("users.table.headers.email", "Correo")} value={email} onChange={(e) => setEmail(e.target.value)} className="py-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1"> {getText("login.passwordLabel", "Password")} </label>
              <Input placeholder={getText("login.passwordLabel", "Password")} value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1"> {getText("users.form.confirmLabel", "Confirm password")} </label>
              <Input placeholder={getText("users.form.confirmLabel", "Confirm password")} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} type="password" className="py-2" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span className="text-sm">{getText("users.form.activeLabel", "Activo")}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isStaff} onChange={(e) => setIsStaff(e.target.checked)} />
              <span className="text-sm">{getText("users.form.staffLabel", "Staff")}</span>
            </label>
          </div>

          {/* Permisos - card similar a Edit */}
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-accent/10 rounded-md">
                  <Shield className="h-4 w-4 text-black" />
                </div>
                <div>
                  <CardTitle className="text-sm">{getText("users.permissionsTitle", "Permisos por recurso")}</CardTitle>
                  <p className="text-xs text-muted-foreground">{getText("users.selectPrompt", "")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-3 py-2">
              {loadingOptions ? (
                <div className="text-xs text-muted-foreground">{getText("common.loading", "Cargando opciones de permisos…")}</div>
              ) : Object.keys(availableActions).length === 0 ? (
                <div className="text-xs text-muted-foreground">{getText("users.noPermissionsOptions", "No hay opciones de permisos disponibles.")}</div>
              ) : (
                Object.entries(availableActions).map(([res, acts]) => (
                  <div key={res} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm capitalize">{getResourceLabel(res)}</h4>
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
                              ${isChecked ? "bg-accent/5 border-accent/20 shadow-sm" : "bg-muted/10 border-border hover:bg-muted/20"}
                            `}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isChecked ? <CheckCircle2 className="h-3 w-3 text-accent" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}

                              <div className="min-w-0">
                                <span className="text-xs font-medium capitalize break-words whitespace-normal">
                                  {getActionLabel(res, act)}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 ml-2">
                              <Switch
                                checked={isChecked}
                                onCheckedChange={(checked: boolean) => handleToggle(res, act, checked)}
                                className="transform scale-75"
                                aria-label={getActionLabel(res, act)}
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
                <p className="text-[11px] text-muted-foreground">{getText("users.permissionsHelp", "Los permisos se aplican como resource.action.")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Propiedades - misma estética que Edit - ahora con search */}
          <Card>
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-2 w-full">
                <div className="p-1 bg-accent/10 rounded-md">
                  <Building className="h-4 w-4 text-black" />
                </div>

                <div className="w-full">
                  <div className="flex items-start md:items-center w-full gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{getText("properties.title", "Acceso a propiedades")}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{getText("properties.table.searchPlaceholder", "")}</p>
                    </div>

                    <div className={`${highlightSearch ? "search-highlight search-pulse" : ""} flex-grow`} style={{ minWidth: 220 }}>
                      <Input
                        ref={searchRef}
                        placeholder={getText("properties.table.searchPlaceholder", "Buscar...")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full py-2"
                        aria-label={getText("properties.table.searchPlaceholder", "Buscar...")}
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
                    <p className="text-xs">{getText("properties.table.title", "Propiedades")}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-auto">
                  {filteredProperties.map((p) => {
                    const sel = selectedProperties[p.id] ?? { checked: false, accessType: "viewer" };
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
                            onCheckedChange={(checked) => toggleProperty(p.id, checked)}
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

                        <Select value={sel.accessType} onValueChange={(value) => setPropertyAccessType(p.id, value)} disabled={!sel.checked}>
                          <SelectTrigger className="w-28 text-xs py-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">{getText("properties.form.viewer", "Visor")}</SelectItem>
                            <SelectItem value="editor">{getText("properties.form.editor", "Editor")}</SelectItem>
                            <SelectItem value="admin">{getText("properties.form.admin", "Admin")}</SelectItem>
                            <SelectItem value="full">{getText("properties.form.full", "Completo")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}

                  {filteredProperties.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">{getText("properties.form.noResultsText", "No se encontraron coincidencias.")}</div>}
                </div>
              )}

              <div className="mt-3 p-2 bg-muted/10 rounded-md">
                <p className="text-[11px] text-muted-foreground">{getText("properties.help", "Marcar para otorgar, desmarcar para revocar.")}</p>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end items-center pt-1 gap-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading} className="py-1 px-2 text-sm">
              {getText("actions.cancel", "Cancelar")}
            </Button>
            <Button onClick={handleSubmit} className="ml-1 py-1 px-3 text-sm" disabled={loading}>
              {loading ? `${getText("users.form.buttons.creating", "Creando...")}` : (getText("users.form.buttons.create", "Crear"))}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
