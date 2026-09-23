"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, Badge, Button, Drawer, Dropdown, Layout, Menu, type MenuProps } from "antd";
import { LogOut, Menu as MenuIcon, Scale } from "lucide-react";
import { NAV_ITEMS, isActive } from "./nav";

const { Sider, Header, Content } = Layout;

interface ShellUser {
  display_name: string;
  role: string;
}

export function AppShell({
  user,
  isAdmin,
  queueCount,
  children,
}: {
  user: ShellUser;
  isAdmin: boolean;
  queueCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logoutForm = useRef<HTMLFormElement>(null);
  const items = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
  const selected = items.find((item) => isActive(pathname, item.href))?.href;

  const menuItems: MenuProps["items"] = items.map(({ href, label, icon: Icon, badge }) => ({
    key: href,
    icon: <Icon className="size-[18px]" />,
    label: (
      <Link href={href} onClick={() => setDrawerOpen(false)} className="flex items-center justify-between gap-2">
        {label}
        {badge === "queue" && queueCount > 0 && <Badge count={queueCount} color="#009966" overflowCount={999} />}
      </Link>
    ),
  }));

  const menu = <Menu mode="inline" selectedKeys={selected ? [selected] : []} items={menuItems} className="border-e-0" />;

  const initials = user.display_name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const account = (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: [
          {
            key: "who",
            disabled: true,
            label: (
              <div className="py-1">
                <div className="font-medium text-foreground">{user.display_name}</div>
                <div className="text-sm text-muted-foreground capitalize">{user.role}</div>
              </div>
            ),
          },
          { type: "divider" },
          {
            key: "logout",
            icon: <LogOut className="size-4" />,
            label: "Log out",
            onClick: () => logoutForm.current?.submit(),
          },
        ],
      }}
    >
      <button type="button" className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
        <Avatar style={{ backgroundColor: "#009966" }}>{initials}</Avatar>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">{user.display_name}</span>
          <span className="block text-xs text-muted-foreground capitalize">{user.role}</span>
        </span>
      </button>
    </Dropdown>
  );

  return (
    <Layout className="min-h-screen">
      <form ref={logoutForm} method="post" action="/logout" hidden />
      <Sider
        width={256}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        className="sticky top-0 hidden h-screen border-e border-border lg:block"
      >
        <div className="flex h-full flex-col">
          <Brand />
          <div className="flex-1 overflow-y-auto pt-2">{menu}</div>
          <p className="border-t border-border px-6 py-4 text-xs text-muted-foreground">Internal use only</p>
        </div>
      </Sider>

      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={280}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <Brand />
        {menu}
      </Drawer>

      <Layout>
        <Header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border px-4 md:px-6 xl:px-8">
          <div className="flex items-center gap-2">
            <Button
              type="text"
              aria-label="Open menu"
              icon={<MenuIcon className="size-5" />}
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden"
            />
            <span className="text-base font-semibold tracking-tight lg:hidden">Hardship Allocation</span>
          </div>
          {account}
        </Header>
        <Content className="px-4 py-6 md:px-6 md:py-8 xl:px-8">{children}</Content>
      </Layout>
    </Layout>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex h-16 items-center gap-2.5 border-b border-border px-5 text-foreground">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Scale className="size-[18px]" />
      </span>
      <span className="text-base font-semibold tracking-tight whitespace-nowrap">Hardship Allocation</span>
    </Link>
  );
}
