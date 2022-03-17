import "../index.css";

import type { AppProps } from "next/app";
import { StrictMode } from "react";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <StrictMode>
      <Component {...pageProps} />
    </StrictMode>
  );
}

export default MyApp;
