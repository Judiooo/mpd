import { NextRequest, NextResponse } from "next/server";
import { getMediaInfo } from "@/lib/player/ffprobe";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
try {
const url = req.nextUrl.searchParams.get("url");

```
if (!url) {
  return NextResponse.json(
    { error: "Missing url parameter" },
    { status: 400 }
  );
}

const mediaInfo = await getMediaInfo(url);

return NextResponse.json(mediaInfo);
```

} catch (error) {
const message = error instanceof Error ? error.message : "Unknown error";

```
return NextResponse.json(
  { error: message },
  { status: 500 }
);
```

}
}
