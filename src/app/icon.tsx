import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          background: 'linear-gradient(to bottom right, #4f46e5, #9333ea)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        P
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  );
}
