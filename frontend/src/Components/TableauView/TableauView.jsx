import React from "react";
import TableauEmbed from "../TableauEmbed";

export default function TableauView() {
  return (
    <div
      className="rounded-2xl overflow-hidden mt-6"
      style={{
        height: "calc(100vh - 160px)",
        minHeight: "600px"
      }}
    >
      <TableauEmbed />
    </div>
  );
}