import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export function notFound(error = "Not found.") {
  return NextResponse.json({ error }, { status: 404 });
}

export function serverError() {
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
