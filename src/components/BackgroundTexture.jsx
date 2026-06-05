import React from 'react';
import { HexGrid, Layout, Hexagon, GridGenerator } from 'react-hexgrid';
import { useApp } from '../context/AppContext';

export default function BackgroundTexture() {
  const { darkMode } = useApp();
  
  // Generate a grid of hexagons to act as the infinity background
  const hexagons = GridGenerator.rectangle(40, 40);
  
  // Subtly colored strokes to represent honeycombs
  const strokeColor = darkMode ? 'rgba(250, 129, 18, 0.15)' : 'rgba(250, 129, 18, 0.35)';

  return (
    <div className="background-texture" style={{ zIndex: 0, opacity: 0.7 }}>
      <HexGrid width="100%" height="100%" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice">
        <Layout size={{ x: 6, y: 6 }} flat={false} spacing={1.01} origin={{ x: -100, y: -100 }}>
          {hexagons.map((hex, i) => (
            <Hexagon 
              key={i} 
              q={hex.q} 
              r={hex.r} 
              s={hex.s} 
              fill="transparent" 
              className="bg-hexagon"
            />
          ))}
        </Layout>
      </HexGrid>
    </div>
  );
}
