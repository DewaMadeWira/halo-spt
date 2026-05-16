import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/Components/ui/sidebar";
import { PropsWithChildren } from "react";

export default function SidebarLayout({ children }: PropsWithChildren) {
    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="px-4 py-3">
                        <div className="text-lg font-semibold">Halo SPT</div>
                        <div className="text-sm text-muted-foreground">
                            Admin
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <nav className="px-2 py-1">
                            <a
                                href="/"
                                className="block py-2 px-3 rounded hover:bg-muted"
                            >
                                Home
                            </a>
                            <a
                                href="/master-data"
                                className="block py-2 px-3 rounded hover:bg-muted"
                            >
                                Master Data
                            </a>
                            <a
                                href="/imports"
                                className="block py-2 px-3 rounded hover:bg-muted"
                            >
                                Imports
                            </a>
                        </nav>
                    </SidebarGroup>
                    <SidebarGroup>
                        <nav className="px-2 py-1">
                            <a
                                href="/settings"
                                className="block py-2 px-3 rounded hover:bg-muted"
                            >
                                Settings
                            </a>
                        </nav>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                        v0.1 — Test Sidebar
                    </div>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset className="bg-gray-100">
                <SidebarTrigger />
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
