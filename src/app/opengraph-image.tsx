import { ImageResponse } from "next/og";

// Configuration
export const alt = process.env.NEXT_PUBLIC_FRAME_NAME || "Celo Projects";
export const size = {
  width: 600,
  height: 400,
};
export const contentType = "image/png";

// Dynamically generated OG image for frame preview
export default async function Image() {
  // Fetch Poppins font for Celo branding
  const poppinsBold = fetch(
    new URL("https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2", import.meta.url)
  ).then(res => res.arrayBuffer());

  // Placeholder for Celo logo or background (replace with your preferred image URL)
  const celoBackground = "https://99bitcoins.com/wp-content/uploads/2024/08/CELOcrypto-768x436.jpg"; // From your FrameApp.tsx

  return new ImageResponse(
    (
      <div
        tw="h-full w-full flex flex-col justify-between items-center relative bg-gradient-to-br from-[#FBCC5C] to-[#35D07F] text-white"
        style={{
          fontFamily: '"Poppins"',
          backgroundImage: `url(${celoBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      >
        {/* Overlay for better text readability */}
        <div tw="absolute inset-0 bg-black/40" />

        {/* Header Section */}
        <div tw="flex flex-col items-center mt-8 z-10">
          <h1 tw="text-4xl sm:text-5xl font-bold text-center px-4 drop-shadow-lg">
            {alt}
          </h1>
          <p tw="text-lg sm:text-xl font-medium text-center mt-2 px-4 drop-shadow-md">
            Swipe to Support Celo Projects
          </p>
        </div>

        {/* Footer Section */}
        <div tw="flex items-center justify-center mb-6 z-10">
          <span tw="text-sm sm:text-base font-semibold bg-white/20 px-4 py-2 rounded-full">
            Powered by Celo
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Poppins",
          data: await poppinsBold,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}