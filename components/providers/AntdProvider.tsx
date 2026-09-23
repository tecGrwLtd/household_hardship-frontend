"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, type ThemeConfig } from "antd";

// Matches --primary in globals.css so Tailwind-styled charts and antd controls share one green.
const PRIMARY = "#009966";

const theme: ThemeConfig = {
  token: {
    colorPrimary: PRIMARY,
    colorLink: PRIMARY,
    colorBgLayout: "#f4f7f5",
    colorTextBase: "#16241d",
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize: 15,
    borderRadius: 10,
    controlHeight: 38,
  },
  components: {
    Layout: { siderBg: "#ffffff", headerBg: "#ffffff", bodyBg: "#f4f7f5" },
    Menu: {
      itemHeight: 44,
      itemBorderRadius: 8,
      itemSelectedBg: "#e3f5ec",
      itemSelectedColor: "#006b47",
      itemColor: "#4a5a52",
      iconSize: 17,
      itemMarginInline: 12,
    },
    Card: { headerFontSize: 17, bodyPadding: 22, headerHeight: 58 },
    Table: { headerBg: "#f6f9f7", headerColor: "#4a5a52", cellPaddingBlock: 13, cellFontSize: 15 },
    Form: { labelFontSize: 15, verticalLabelPadding: "0 0 6px" },
    Statistic: { contentFontSize: 28, titleFontSize: 15 },
    Descriptions: { labelColor: "#5d6d65", titleMarginBottom: 12 },
  },
};

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    // `layer` puts antd's styles in @layer antd, ordered in globals.css so Tailwind utilities still win.
    <AntdRegistry layer>
      <ConfigProvider theme={theme}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
