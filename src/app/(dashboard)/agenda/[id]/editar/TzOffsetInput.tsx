"use client";
import { useEffect, useState } from "react";

export function TzOffsetInput() {
  const [offset, setOffset] = useState(0);
  useEffect(() => { setOffset(new Date().getTimezoneOffset()); }, []);
  return <input type="hidden" name="tz_offset" value={offset} />;
}
