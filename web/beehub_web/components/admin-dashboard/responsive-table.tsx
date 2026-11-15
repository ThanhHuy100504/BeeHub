import type { CSSProperties, ReactNode } from "react";
import styles from "./responsive-table.module.css";

/** Keep one set of rows/actions; present each row as a labelled card on mobile. */
export function ResponsiveTable({ columns, children }: { columns: readonly string[]; children: ReactNode }) {
  const hasIndex = columns[0] === "STT" || columns[0] === "#";
  const fullWidthLabels = ["Email", "Nội dung", "Lý do", "Tiêu đề", "Tin đăng", "Tuyến đường", "Ngân hàng"];
  const labels = Object.fromEntries(columns.flatMap((label, index) => [
    [`--column-${index + 1}-label`, JSON.stringify(label || "Thao tác")],
    [`--column-${index + 1}-span`, index === (hasIndex ? 1 : 0) || fullWidthLabels.includes(label) ? "span 2" : "span 1"],
  ])) as CSSProperties;
  return <div className={styles.container} data-index-column={hasIndex} style={labels}>{children}</div>;
}
