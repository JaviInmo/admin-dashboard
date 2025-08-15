"use client";

import { Link } from "react-router-dom";
import {
  Bell,
  LogOut,
  Package2,
  LayoutDashboard,
  Users,
  Briefcase,
  UserRoundCheck,
  Home,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { logout as authLogout } from "@/lib/services/auth";
import { getUser } from "@/lib/auth-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { AVATAR_CONFIG } from "@/config/ui-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

import DashboardContent from "@/components/Dashboard/dashboard-content";
import SalesRegistrationContent from "@/components/Clients/client-page";
import GuardsContent from "./Guards/guard-page";
import UserPage from "./Users/UsersPage";
import PropertiesContent from "./Properties/properties-page";

type DashboardLayoutProps = { onLogout: () => void };

export default function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { TEXT, lang, setLang } = useI18n();

  // Derive cool initials and a unique gradient from saved user claims
  const claims = getUser();
  const username: string = (claims?.username ?? "").toString();
  const firstName: string = (
    claims?.first_name ??
    claims?.firstName ??
    ""
  ).toString();
  const lastName: string = (
    claims?.last_name ??
    claims?.lastName ??
    ""
  ).toString();

  const initials = (() => {
    const f = firstName.trim();
    const l = lastName.trim();
    const max = AVATAR_CONFIG.initialsMaxLen;
    if (f && l) return (f[0] + l[0]).slice(0, max).toUpperCase();
    if (f) return f.slice(0, max).toUpperCase();
    if (username) return username.slice(0, max).toUpperCase();
    return AVATAR_CONFIG.fallbackInitial;
  })();

  const hueBase = (() => {
    const s = username || `${claims?.user_id ?? ""}`;
    let hash = 0;
    for (let i = 0; i < s.length; i++)
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return hash % 360;
  })();
  const hueShift = AVATAR_CONFIG.hueShift;
  const gradStart = `hsl(${hueBase} 70% 45%)`;
  const gradEnd = `hsl(${(hueBase + hueShift) % 360} 70% 55%)`;
  // Role-based palette with deterministic fallback
  const roleRaw = (claims?.role ?? claims?.user_role ?? "")
    .toString()
    .toLowerCase();
  const isAdmin =
    !!claims?.is_admin ||
    roleRaw === "admin" ||
    roleRaw === "superuser" ||
    roleRaw === "staff";
  const role = roleRaw || (isAdmin ? "admin" : "");
  const [finalStart, finalEnd] = AVATAR_CONFIG.roleGradients[role] ?? [
    gradStart,
    gradEnd,
  ];
  const avatarStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${finalStart}, ${finalEnd})`,
    color: "white",
  };
  const avatarClass = `${AVATAR_CONFIG.sizeClass} ${AVATAR_CONFIG.ringClass}`;

  const menuItems = [
    {
      key: "Dashboard",
      label: TEXT.menu.dashboard,
      icon: LayoutDashboard,
      component: <DashboardContent />,
    },
    {
      key: "Clients",
      label: TEXT.menu.clients,
      icon: Briefcase,
      component: <SalesRegistrationContent />,
    },
    {
      key: "Guards",
      label: TEXT.menu.guards,
      icon: Users,
      component: <GuardsContent />,
    },
    {
      key: "Users",
      label: TEXT.menu.users,
      icon: UserRoundCheck,
      component: <UserPage />,
    },
    {
      key: "Properties",
      label: TEXT.menu.properties,
      icon: Home,
      component: <PropertiesContent />,
    },
  ];

  const renderMainContent = () => {
    const selected = menuItems.find((item) => item.key === activeMenuItem);
    return selected ? (
      selected.component
    ) : (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h2 className="text-2xl font-bold">{TEXT.common.notFoundTitle}</h2>
        <p className="text-muted-foreground">
          {TEXT.common.notFoundDescription}
        </p>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <Sidebar collapsible="icon" side="left">
          <SidebarHeader className="p-2">
            <Link to="#" className="flex items-center gap-2 font-semibold p-2">
              <Package2 className="h-6 w-6" />
              <span className="group-data-[state=collapsed]:hidden">
                {TEXT.appName}
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                {TEXT.sidebar.navigationLabel}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map(({ key, label, icon: Icon }) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        onClick={() => setActiveMenuItem(key)}
                        className={activeMenuItem === key ? "bg-muted" : ""}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-1 lg:hidden" />
            <div className="flex-1" />

            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">{TEXT.header.notificationsAria}</span>
            </Button>

            {/* Language segmented toggle: | EN* | ES | */}
            <div className="mx-2">
              <div
                role="group"
                aria-label={TEXT.accountMenu.language}
                className="inline-flex items-stretch rounded-md border overflow-hidden bg-background"
              >
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  aria-pressed={lang === "en"}
                  className={`px-3 py-1 text-xs font-medium transition-colors border-r ${
                    lang === "en"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {lang === "en" ? "EN" : "EN"}
                </button>
                <button
                  type="button"
                  onClick={() => setLang("es")}
                  aria-pressed={lang === "es"}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    lang === "es"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {lang === "es" ? "ES" : "ES"}
                </button>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className={avatarClass}>
                    <AvatarFallback style={avatarStyle}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">{TEXT.header.userMenuAria}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Language options moved to header segmented toggle */}
                <DropdownMenuItem>{TEXT.accountMenu.settings}</DropdownMenuItem>
                <DropdownMenuItem>{TEXT.accountMenu.support}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{TEXT.accountMenu.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {renderMainContent()}

          {/* Logout confirmation dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{TEXT.logoutDialog.title}</DialogTitle>
                <DialogDescription>
                  {TEXT.logoutDialog.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  {TEXT.logoutDialog.cancel}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setConfirmOpen(false);
                    try {
                      await authLogout();
                      // Toast notification
                      toast.success(TEXT.logoutDialog.successToast);
                    } finally {
                      onLogout();
                    }
                  }}
                >
                  {TEXT.logoutDialog.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
