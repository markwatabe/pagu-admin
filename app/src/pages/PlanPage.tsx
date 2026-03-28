import { Canvas } from '@react-three/fiber';
import { OrbitControls, Plane, useTexture } from '@react-three/drei';

function FloorPlan() {
  const texture = useTexture('/floor-plan.png');
  const aspect = texture.image.width / texture.image.height;
  const planeWidth = 10;
  const planeHeight = planeWidth / aspect;

  return (
    <Plane args={[planeWidth, planeHeight]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={texture} />
    </Plane>
  );
}

export function PlanPage() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={0.5} />
        <FloorPlan />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
