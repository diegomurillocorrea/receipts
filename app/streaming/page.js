import { PostPdfDownload } from "../post/post-pdf-download";
import { StreamingView } from "./streaming-view";

export default function StreamingPage() {
  return (
    <>
      <PostPdfDownload downloadFileName="Cartel-DAIEGO-Streaming.pdf" />
      <StreamingView />
    </>
  );
}
