import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#000',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <div
          style={{
            fontSize: '100px',
            fontWeight: 'bold',
            background: 'linear-gradient(to bottom right, #4f46e5, #9333ea)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          P
        </div>
      </div>
    ),
    {
      width: 180,
      height: 180,
    }
  );
}
