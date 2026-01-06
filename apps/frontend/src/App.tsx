import { iconMap } from '@/shared/components/icon/iconMap';

function App() {
  return (
    <div style={{ padding: '40px' }}>
      <h1>Icon Gallery</h1>

      <h2 style={{ marginTop: '40px', color: 'purple' }}>20px Purple Icons</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '20px',
          marginTop: '20px',
        }}
      >
        {Object.entries(iconMap).map(([name, IconComponent]) => (
          <div
            key={name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <IconComponent
              style={{
                width: '20px',
                height: '20px',
                color: 'purple',
              }}
            />
            <span style={{ fontSize: '12px', textAlign: 'center', wordBreak: 'break-word' }}>
              {name}
            </span>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: '60px', color: 'green' }}>32px Green Icons</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '20px',
          marginTop: '20px',
        }}
      >
        {Object.entries(iconMap).map(([name, IconComponent]) => (
          <div
            key={name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <IconComponent
              style={{
                width: '32px',
                height: '32px',
                color: 'green',
              }}
            />
            <span style={{ fontSize: '12px', textAlign: 'center', wordBreak: 'break-word' }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
