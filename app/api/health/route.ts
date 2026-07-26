export async function GET() {
  return Response.json({
    status: "ok",
    service: "flowdine-ai",
    timestamp: new Date().toISOString(),
  });
}
