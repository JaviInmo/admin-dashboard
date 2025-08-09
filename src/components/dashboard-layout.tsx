"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { Bell, LogOut, Package2, User, LayoutDashboard, Users, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
} from "@/components/ui/sidebar"

// Importa los nuevos componentes de contenido
import DashboardContent from "@/components/Dashboard/dashboard-content"
import SalesRegistrationContent from "@/components/Clients/client-page"
import UsersContent from "@/components/Guards/guard-page"

export default function DashboardLayout() {
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');

  const renderMainContent = () => {
    switch (activeMenuItem) {
      case 'Dashboard':
        return <DashboardContent />;
      case 'Sales Registration':
        return <SalesRegistrationContent />;
      case 'Users':
        return <UsersContent />;
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <h2 className="text-2xl font-bold">Contenido no encontrado</h2>
            <p className="text-muted-foreground">Selecciona una opción del menú.</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" side="left">
          <SidebarHeader className="p-2">
            <Link to="#" className="flex items-center gap-2 font-semibold p-2">
              <Package2 className="h-6 w-6" />
              <span className="group-data-[state=collapsed]:hidden">Acme Inc</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveMenuItem('Dashboard')}
                      className={activeMenuItem === 'Dashboard' ? 'bg-muted' : ''}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveMenuItem('Sales Registration')}
                      className={activeMenuItem === 'Sales Registration' ? 'bg-muted' : ''}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Clients</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveMenuItem('Users')}
                      className={activeMenuItem === 'Users' ? 'bg-muted' : ''}
                    >
                      <Users className="h-4 w-4" />
                      <span>Guards</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="-ml-1 lg:hidden" />
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          {renderMainContent()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
