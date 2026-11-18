// Marisol Heat — shared constants for the open-world game.
// The city of Marisol is a top-down 2D grid town split into five districts.
// All names, characters and story beats are original fiction.

export const WORLD = {
  size: 3600, // world is size x size pixels
  block: 420, // distance between road centrelines
  road: 92, // road width
  districts: [
    { name: 'Old Town', x0: 0, y0: 0, x1: 1800, y1: 1800, ground: '#3d4a35', road: '#2e2e33' },
    { name: 'Harbour', x0: 1800, y0: 0, x1: 3600, y1: 1800, ground: '#37424a', road: '#2c2f36' },
    { name: 'Market Row', x0: 0, y0: 1800, x1: 1800, y1: 3600, ground: '#4a4034', road: '#33302a' },
    { name: 'Palm Heights', x0: 1800, y0: 1800, x1: 3600, y1: 3600, ground: '#3a4a38', road: '#2d332e' },
    { name: 'Downtown', x0: 1350, y0: 1350, x1: 2250, y1: 2250, ground: '#413a4a', road: '#2f2b38' },
  ],
};

export const CARS = [
  { model: 'Pinto', color: '#c8a24a', top: 96, accel: 0.16, max: 5.4, hp: 60 },
  { model: 'Sedan', color: '#4a7ec2', top: 104, accel: 0.18, max: 6.2, hp: 80 },
  { model: 'Taxi', color: '#e0b52a', top: 100, accel: 0.17, max: 5.8, hp: 70 },
  { model: 'Pickup', color: '#7a4a2e', top: 110, accel: 0.15, max: 5.2, hp: 110 },
  { model: 'Falcon GT', color: '#c23a3a', top: 118, accel: 0.24, max: 8.0, hp: 90 },
];

export const MISSIONS = [
  {
    id: 1, title: 'Pesan Mama Luz',
    brief: 'Mama Luz needs her van moved. Drive it to the market stall.',
    target: { x: 630, y: 3150, label: 'Market stall' },
  },
  {
    id: 2, title: 'Antar Paket',
    brief: 'A sealed parcel for the harbour office. Deliver it quickly.',
    target: { x: 3150, y: 630, label: 'Harbour office' },
  },
  {
    id: 3, title: 'Curi Falcon GT',
    brief: 'Rico hid a Falcon GT at the garage. Take it. Cops will come.',
    target: { x: 3150, y: 3150, label: 'Safehouse' },
  },
  {
    id: 4, title: 'Kejar Rico',
    brief: 'Rico is running in his red sedan. Ram his car until it quits.',
    target: { x: 1800, y: 1800, label: 'Rico' },
  },
  {
    id: 5, title: 'Gudang Pelabuhan',
    brief: 'On foot. Clear the warehouse guards and grab the three crates.',
    target: { x: 3150, y: 630, label: 'Warehouse' },
  },
  {
    id: 6, title: 'Pelarian Terakhir',
    brief: 'The whole city is after you. Reach the Old Town safehouse.',
    target: { x: 630, y: 630, label: 'Safehouse' },
  },
];

export const SAVE_KEY = 'marisol-heat-save-v1';
export const VIEW_W = 1280;
export const VIEW_H = 800;
