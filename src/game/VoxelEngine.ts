/**
 * CloudCraft High-Craft 3D Diorama Engine
 * Beveled architectural board, zone headers, 3D glowing target placement rings,
 * floating component nameplates, physical patch cables, and packet simulation.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VoxelBlock, Connection, TrafficPacket, AWSComponentType, TargetPlacement, NetworkViolation } from './types';
import { createComponentVoxelModel, createComponentLabelSprite, createFailureDiagnosticSprite } from './voxelAssets';
import { COMPONENT_METAS } from './levels';
import { sound } from './audio';

export interface VoxelEngineCallbacks {
  onSelectComponent: (component: VoxelBlock | null) => void;
  onConnect: (fromId: string, toId: string) => void;
  onPlace: (type: AWSComponentType, gridX: number, gridZ: number) => void;
  onDelete?: (componentId: string) => void;
  onPacketResult?: (success: boolean, message: string) => void;
}

function createZonePlateMesh(label: string, sublabel: string, accentHex: string, widthWorld: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#11151e';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#252d3d';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 122);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 512, 10);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 256, 56);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.fillText(sublabel, 256, 96);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const geo = new THREE.PlaneGeometry(widthWorld, 0.85);
  geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

export class VoxelEngine {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private frameId: number = 0;
  private isDestroyed = false;
  private elapsedTime = 0;

  // Camera Control state
  private targetCameraPos = new THREE.Vector3(0, 15.5, 18.5);
  private currentCameraPos = new THREE.Vector3(0, 15.5, 18.5);
  private cameraLookAt = new THREE.Vector3(0, 0.3, 0.4);
  private targetLookAt = new THREE.Vector3(0, 0.3, 0.4);
  private isDragging = false;
  private dragMoved = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private orbitAngle = 0;
  private orbitRadius = 23;
  private heldKeys = new Set<string>();

  // Scene Groups
  private gridGroup = new THREE.Group();
  private targetMarkersGroup = new THREE.Group();
  private componentsGroup = new THREE.Group();
  private cablesGroup = new THREE.Group();
  private packetsGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();
  private diagnosticsGroup = new THREE.Group();
  private hoverMarker!: THREE.Mesh;
  private selectionMarker!: THREE.Mesh;
  private wireSourceMarker!: THREE.Mesh;

  // Interactivity state
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private groundRayTarget = new THREE.Vector3();
  private selectedComponentId: string | null = null;

  // Tools & Callbacks
  public activeTool: 'select' | 'cable' | 'delete' | 'place' = 'select';
  public placingType: AWSComponentType | null = null;
  public cableSourceId: string | null = null;
  private callbacks: VoxelEngineCallbacks;

  // Simulation state
  private stateComponents: VoxelBlock[] = [];
  private stateConnections: Connection[] = [];
  private targetPlacements: TargetPlacement[] = [];
  private activePackets: TrafficPacket[] = [];
  private componentMeshMap = new Map<string, THREE.Group>();

  constructor(container: HTMLDivElement, callbacks: VoxelEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Scene & Studio Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e14);
    this.scene.fog = new THREE.FogExp2(0x0b0e14, 0.018);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(38, width / Math.max(1, height), 0.1, 120);
    this.resetCamera();
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.targetLookAt);

    // Balanced 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.85);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
    keyLight.position.set(14, 24, 12);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 55;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-14, 12, -10);
    this.scene.add(rimLight);

    // Build Tactile Diorama Board
    this.buildVoxelGrid();
    this.scene.add(this.gridGroup);
    this.scene.add(this.targetMarkersGroup);
    this.scene.add(this.componentsGroup);
    this.scene.add(this.cablesGroup);
    this.scene.add(this.packetsGroup);
    this.scene.add(this.particlesGroup);
    this.scene.add(this.diagnosticsGroup);

    this.buildMarkers();
    this.bindEvents();
    this.tick();
  }

  private buildVoxelGrid() {
    while (this.gridGroup.children.length > 0) {
      this.gridGroup.remove(this.gridGroup.children[0]);
    }

    const tileSize = 1.4;

    // 1. Thick Architectural Diorama Base Slab beneath the entire board
    const slabGeo = new THREE.BoxGeometry(15.6 * tileSize, 0.45, 7.6 * tileSize);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x11151f,
      roughness: 0.75,
      metalness: 0.25
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.34, 0.2);
    slab.receiveShadow = true;
    this.gridGroup.add(slab);

    // Brushed outer trim frame
    const frameGeo = new THREE.BoxGeometry(15.8 * tileSize, 0.14, 7.8 * tileSize);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2534,
      roughness: 0.4,
      metalness: 0.7
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, -0.22, 0.2);
    this.gridGroup.add(frame);

    // 2. Individual Recessed Socket Tiles (-7..7 on X, -3..3 on Z)
    const tileGeo = new THREE.BoxGeometry(tileSize * 0.92, 0.12, tileSize * 0.92);
    const socketGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.02, 12);

    const matExternal = new THREE.MeshStandardMaterial({ color: 0x131822, roughness: 0.7, metalness: 0.25 });
    const matEdge = new THREE.MeshStandardMaterial({ color: 0x142230, roughness: 0.6, metalness: 0.35 });
    const matPublic = new THREE.MeshStandardMaterial({ color: 0x12262e, roughness: 0.55, metalness: 0.4 });
    const matPrivate = new THREE.MeshStandardMaterial({ color: 0x1b192e, roughness: 0.55, metalness: 0.4 });
    const socketMat = new THREE.MeshStandardMaterial({ color: 0x2a3346, roughness: 0.35, metalness: 0.8 });

    for (let gx = -7; gx <= 7; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        let mat = matExternal;
        if (gx >= -4 && gx < -1) mat = matEdge;
        else if (gx >= -1 && gx <= 2) mat = matPublic;
        else if (gx > 2) mat = matPrivate;

        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(gx * tileSize, -0.06, gz * tileSize);
        tile.receiveShadow = true;
        tile.userData = { gridX: gx, gridZ: gz };
        this.gridGroup.add(tile);

        const socket = new THREE.Mesh(socketGeo, socketMat);
        socket.position.set(gx * tileSize, 0.005, gz * tileSize);
        this.gridGroup.add(socket);
      }
    }

    // 3. Subnet Divider Barrier (between Public Subnet X<=2 and Private Subnet X>=3)
    const splitX = 2.5 * tileSize;
    const postGeo = new THREE.BoxGeometry(0.14, 0.65, 0.14);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.85 });
    const railGeo = new THREE.BoxGeometry(0.04, 0.06, 7.0 * tileSize);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0xd97706,
      emissiveIntensity: 0.35
    });

    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.set(splitX, 0.32, -3.5 * tileSize);
    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.set(splitX, 0.32, 3.5 * tileSize);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(splitX, 0.45, 0);
    this.gridGroup.add(post1, post2, rail);

    // 4. Crisp 3D Zone Nameplates along the front of the board (Z = 3.85 * tileSize)
    const frontZ = 3.78 * tileSize;

    const extPlate = createZonePlateMesh('INTERNET ZONE', 'External Users', '#38bdf8', 3.6);
    extPlate.position.set(-6.0 * tileSize, -0.08, frontZ);

    const edgePlate = createZonePlateMesh('EDGE / DNS', 'IGW · WAF · Route 53', '#14b8a6', 3.8);
    edgePlate.position.set(-2.5 * tileSize, -0.08, frontZ);

    const pubPlate = createZonePlateMesh('PUBLIC SUBNET', 'Web Servers · Load Balancers', '#10b981', 5.2);
    pubPlate.position.set(0.5 * tileSize, -0.08, frontZ);

    const privPlate = createZonePlateMesh('PRIVATE SUBNET', 'Databases · Internal Services', '#6366f1', 6.4);
    privPlate.position.set(5.0 * tileSize, -0.08, frontZ);

    this.gridGroup.add(extPlate, edgePlate, pubPlate, privPlate);
  }

  private buildMarkers() {
    // Hover Tile Ring
    const hoverGeo = new THREE.RingGeometry(0.52, 0.62, 4);
    hoverGeo.rotateX(-Math.PI / 2);
    hoverGeo.rotateY(Math.PI / 4);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.hoverMarker = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverMarker.position.y = 0.02;
    this.hoverMarker.visible = false;
    this.scene.add(this.hoverMarker);

    // Selected Component Ring
    const selectGeo = new THREE.TorusGeometry(0.76, 0.035, 8, 32);
    const selectMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    this.selectionMarker = new THREE.Mesh(selectGeo, selectMat);
    this.selectionMarker.rotation.x = Math.PI / 2;
    this.selectionMarker.position.y = 0.04;
    this.selectionMarker.visible = false;
    this.scene.add(this.selectionMarker);

    // Cable Source Active Ring
    const wireGeo = new THREE.TorusGeometry(0.82, 0.04, 8, 32);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8
    });
    this.wireSourceMarker = new THREE.Mesh(wireGeo, wireMat);
    this.wireSourceMarker.rotation.x = Math.PI / 2;
    this.wireSourceMarker.position.y = 0.05;
    this.wireSourceMarker.visible = false;
    this.scene.add(this.wireSourceMarker);
  }

  private updateMouseFromEvent(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
  }

  private getIdealOrbitRadius(): number {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);
    if (aspect < 0.65) {
      return Math.min(38, Math.round(18.5 / Math.max(0.46, aspect)));
    }
    if (aspect < 1.0) {
      return 28;
    }
    return 23;
  }

  private bindEvents() {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragMoved = false;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.updateMouseFromEvent(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    el.addEventListener('pointermove', (e) => {
      this.updateMouseFromEvent(e.clientX, e.clientY);

      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouseX;
        const deltaY = e.clientY - this.previousMouseY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.dragMoved = true;
        }
        this.previousMouseX = e.clientX;
        this.previousMouseY = e.clientY;

        this.orbitAngle -= deltaX * 0.007;
        this.targetCameraPos.y = Math.max(7, Math.min(32, this.targetCameraPos.y - deltaY * 0.05));
        this.updateCameraOrbit(this.orbitAngle);
      }
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbitRadius = Math.max(11, Math.min(42, this.orbitRadius + e.deltaY * 0.018));
      this.updateCameraOrbit(this.orbitAngle);
    }, { passive: false });

    // Pinch-to-zoom and two-finger pan support for mobile phones
    let initialTouchDistance = 0;
    let prevMidX = 0;
    let prevMidY = 0;

    el.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.updateMouseFromEvent(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.dragMoved = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDistance = Math.hypot(dx, dy);
        prevMidX = (e.touches[0].clientX + e.touches[1].clientX) * 0.5;
        prevMidY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDistance > 0) {
        this.dragMoved = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        const diff = initialTouchDistance - currentDistance;
        this.orbitRadius = Math.max(11, Math.min(42, this.orbitRadius + diff * 0.05));

        const midX = (e.touches[0].clientX + e.touches[1].clientX) * 0.5;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
        const panX = (midX - prevMidX) * 0.02;
        const panZ = (midY - prevMidY) * 0.02;
        this.targetLookAt.x = Math.max(-7, Math.min(7, this.targetLookAt.x - panX));
        this.targetLookAt.z = Math.max(-4, Math.min(4, this.targetLookAt.z - panZ));

        this.updateCameraOrbit(this.orbitAngle);
        initialTouchDistance = currentDistance;
        prevMidX = midX;
        prevMidY = midY;
      }
    }, { passive: true });

    el.addEventListener('click', (e: MouseEvent) => {
      this.updateMouseFromEvent(e.clientX, e.clientY);
      if (!this.dragMoved) {
        this.handleClick();
      }
    });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('resize', this.onResize);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
    this.heldKeys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onWindowBlur = () => {
    this.heldKeys.clear();
  };

  private onResize = () => {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.orbitRadius = this.getIdealOrbitRadius();
    this.updateCameraOrbit(this.orbitAngle);
  };

  private updateCameraOrbit(angle: number) {
    this.targetCameraPos.x = this.targetLookAt.x + Math.sin(angle) * this.orbitRadius;
    this.targetCameraPos.z = this.targetLookAt.z + Math.cos(angle) * this.orbitRadius;
  }

  public resetCamera() {
    this.orbitAngle = 0;
    this.orbitRadius = this.getIdealOrbitRadius();
    const isPortrait = (this.container.clientWidth || window.innerWidth) < (this.container.clientHeight || window.innerHeight);
    this.targetLookAt.set(0, 0.3, isPortrait ? 0.8 : 0.4);
    this.targetCameraPos.set(0, isPortrait ? 20.5 : 15.5, this.orbitRadius);
    this.updateCameraOrbit(0);
  }

  public setTargetPlacements(targets: TargetPlacement[]) {
    this.targetPlacements = targets || [];
    this.rebuildTargetMarkers();
  }

  private rebuildTargetMarkers() {
    while (this.targetMarkersGroup.children.length > 0) {
      this.targetMarkersGroup.remove(this.targetMarkersGroup.children[0]);
    }

    const tileSize = 1.4;
    this.targetPlacements.forEach((tp) => {
      // Check if already occupied
      const occupied = this.stateComponents.some(
        c => c.gridX === tp.gridX && c.gridZ === tp.gridZ
      );
      if (occupied) return;

      const markerGroup = new THREE.Group();
      markerGroup.position.set(tp.gridX * tileSize, 0.03, tp.gridZ * tileSize);

      // Outer glowing emerald target ring
      const ringGeo = new THREE.TorusGeometry(0.58, 0.045, 10, 32);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.9,
        roughness: 0.2
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'target_ring';
      markerGroup.add(ring);

      // Translucent vertical target beacon cylinder
      const beamGeo = new THREE.CylinderGeometry(0.46, 0.54, 1.2, 20, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 0.6;
      markerGroup.add(beam);

      // Floating Target Label Sprite
      const meta = COMPONENT_METAS[tp.type];
      const sprite = createComponentLabelSprite(
        tp.label || `Place ${meta?.shortLabel || tp.type.toUpperCase()}`,
        'Click tile to deploy',
        '#10b981'
      );
      sprite.position.y = 1.65;
      markerGroup.add(sprite);

      this.targetMarkersGroup.add(markerGroup);
    });
  }

  private getComponentSubtitle(comp: VoxelBlock): string {
    const parts: string[] = [];
    if (comp.config.port) {
      parts.push(`:${comp.config.port}`);
    } else if (comp.type === 'ec2') {
      const has80 = comp.config.securityGroupInbound?.some(r => r.port === 80 || r.port === '80');
      parts.push(has80 ? ':80 open' : 'firewall locked');
    } else if (comp.type === 'rds') {
      parts.push(':5432');
    } else if (comp.type === 'igw' || comp.type === 'nat_gw') {
      parts.push(comp.config.cidr || '0.0.0.0/0');
    }
    parts.push(comp.subnet);
    return parts.join(' · ');
  }

  public updateState(state: { components: VoxelBlock[]; connections: Connection[] }) {
    this.stateComponents = state.components;
    this.stateConnections = state.connections;

    const currentIds = new Set(state.components.map(c => c.id));

    for (const [id, mesh] of this.componentMeshMap.entries()) {
      if (!currentIds.has(id)) {
        this.componentsGroup.remove(mesh);
        this.componentMeshMap.delete(id);
      }
    }

    state.components.forEach(comp => {
      let group = this.componentMeshMap.get(comp.id);
      const meta = COMPONENT_METAS[comp.type];
      const accentColor = meta?.color || '#f59e0b';

      if (!group) {
        group = createComponentVoxelModel(comp.type);
        group.userData = { id: comp.id, type: comp.type };
        this.componentsGroup.add(group);
        this.componentMeshMap.set(comp.id, group);
        this.spawnParticleBurst(comp.gridX * 1.4, 0.5, comp.gridZ * 1.4, 0xf59e0b);
      }

      // Refresh floating 3D label sprite so config changes (like opening Port 80) update live
      const oldLabel = group.getObjectByName('component_label_sprite');
      if (oldLabel) {
        group.remove(oldLabel);
      }
      const labelSprite = createComponentLabelSprite(
        comp.name,
        this.getComponentSubtitle(comp),
        accentColor,
        comp.status,
        comp.type
      );
      group.add(labelSprite);

      group.position.x = comp.gridX * 1.4;
      group.position.z = comp.gridZ * 1.4;
      group.position.y = 0;
    });

    this.rebuildCables();
    this.rebuildTargetMarkers();
    this.updateSelectionMarker();
  }

  private rebuildCables() {
    while (this.cablesGroup.children.length > 0) {
      this.cablesGroup.remove(this.cablesGroup.children[0]);
    }

    const matHealthy = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.4
    });

    const matBlocked = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });

    const plugMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.88
    });
    const plugGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10);

    this.stateConnections.forEach(conn => {
      const fromMesh = this.componentMeshMap.get(conn.fromId);
      const toMesh = this.componentMeshMap.get(conn.toId);
      if (!fromMesh || !toMesh) return;

      const p1 = fromMesh.position.clone().add(new THREE.Vector3(0, 0.28, 0));
      const p2 = toMesh.position.clone().add(new THREE.Vector3(0, 0.28, 0));

      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      mid.y = 0.65 + p1.distanceTo(p2) * 0.06;

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.045, 8, false);
      const tube = new THREE.Mesh(tubeGeo, conn.allowed ? matHealthy : matBlocked);
      this.cablesGroup.add(tube);

      // Physical brass terminal plugs at both ends
      const plug1 = new THREE.Mesh(plugGeo, plugMat);
      plug1.position.copy(p1);
      const plug2 = new THREE.Mesh(plugGeo, plugMat);
      plug2.position.copy(p2);
      this.cablesGroup.add(plug1, plug2);
    });
  }

  private handleClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const compHits = this.raycaster.intersectObjects(this.componentsGroup.children, true);

    if (compHits.length > 0) {
      let hitObj: THREE.Object3D | null = compHits[0].object;
      while (hitObj && hitObj.parent && hitObj.parent !== this.componentsGroup) {
        hitObj = hitObj.parent;
      }

      const compId = hitObj?.userData?.id;
      if (compId) {
        if (this.activeTool === 'delete') {
          const comp = this.stateComponents.find(c => c.id === compId);
          if (!comp || comp.type === 'client' || comp.locked) {
            sound.playFail();
            if (this.callbacks.onPacketResult) {
              this.callbacks.onPacketResult(
                false,
                `Protected Scenario Component: "${comp?.name || 'This block'}" is required for this scenario and cannot be deleted.`
              );
            }
            return;
          }
          sound.playClick();
          if (this.callbacks.onDelete) {
            this.callbacks.onDelete(compId);
          }
          this.callbacks.onSelectComponent(null);
          this.selectedComponentId = null;
          return;
        }

        if (this.activeTool === 'cable') {
          if (!this.cableSourceId) {
            this.cableSourceId = compId;
            sound.playClick();
            this.updateSelectionMarker();
          } else if (this.cableSourceId !== compId) {
            sound.playCableConnect();
            this.callbacks.onConnect(this.cableSourceId, compId);
            this.cableSourceId = null;
            this.updateSelectionMarker();
          }
          return;
        }

        sound.playClick();
        this.selectedComponentId = compId;
        const selected = this.stateComponents.find(c => c.id === compId) || null;
        this.callbacks.onSelectComponent(selected);
        this.updateSelectionMarker();
        return;
      }
    }

    if (this.raycaster.ray.intersectPlane(this.groundPlane, this.groundRayTarget)) {
      const gx = Math.round(this.groundRayTarget.x / 1.4);
      const gz = Math.round(this.groundRayTarget.z / 1.4);

      if (this.activeTool === 'place' && this.placingType) {
        const existing = this.stateComponents.find(c => c.gridX === gx && c.gridZ === gz);
        if (!existing && gx >= -7 && gx <= 7 && gz >= -3 && gz <= 3) {
          sound.playPlace();
          this.callbacks.onPlace(this.placingType, gx, gz);
          return;
        }
      }

      this.selectedComponentId = null;
      this.cableSourceId = null;
      this.callbacks.onSelectComponent(null);
      this.updateSelectionMarker();
    }
  }

  private updateSelectionMarker() {
    if (this.selectedComponentId) {
      const mesh = this.componentMeshMap.get(this.selectedComponentId);
      if (mesh) {
        this.selectionMarker.visible = true;
        this.selectionMarker.position.x = mesh.position.x;
        this.selectionMarker.position.z = mesh.position.z;
      } else {
        this.selectionMarker.visible = false;
      }
    } else {
      this.selectionMarker.visible = false;
    }

    if (this.cableSourceId) {
      const srcMesh = this.componentMeshMap.get(this.cableSourceId);
      if (srcMesh) {
        this.wireSourceMarker.visible = true;
        this.wireSourceMarker.position.x = srcMesh.position.x;
        this.wireSourceMarker.position.z = srcMesh.position.z;
      } else {
        this.wireSourceMarker.visible = false;
      }
    } else {
      this.wireSourceMarker.visible = false;
    }
  }

  public showViolationsIn3D(violations: NetworkViolation[]) {
    while (this.diagnosticsGroup.children.length > 0) {
      this.diagnosticsGroup.remove(this.diagnosticsGroup.children[0]);
    }

    violations.slice(0, 2).forEach((v, idx) => {
      const wx = v.worldX ?? 0;
      const wz = v.worldZ ?? 0;
      const sprite = createFailureDiagnosticSprite(v.title, v.plainEnglishReason);
      sprite.position.set(wx, 2.75 + idx * 0.95, wz);
      this.diagnosticsGroup.add(sprite);
      this.spawnParticleBurst(wx, 0.7, wz, 0xef4444);
    });
  }

  public clearViolationsIn3D() {
    while (this.diagnosticsGroup.children.length > 0) {
      this.diagnosticsGroup.remove(this.diagnosticsGroup.children[0]);
    }
  }

  public simulateTraffic(onComplete?: (success: boolean) => void) {
    this.activePackets = [];
    if (this.stateConnections.length === 0) {
      if (this.callbacks.onPacketResult) {
        this.callbacks.onPacketResult(false, 'No network cables connected! Use the Wire tool to link components.');
      }
      sound.playPacketPing(false);
      onComplete?.(false);
      return;
    }

    this.stateConnections.forEach((conn, idx) => {
      const packet: TrafficPacket = {
        id: `pkt-${Date.now()}-${idx}`,
        fromId: conn.fromId,
        toId: conn.toId,
        progress: 0,
        status: conn.allowed ? 'transmitting' : 'dropped',
        color: conn.allowed ? '#10b981' : '#ef4444',
        payloadType: 'HTTP GET /',
        stopAtProgress: conn.allowed ? 1.0 : 0.62
      };
      this.activePackets.push(packet);
    });

    sound.playPacketPing(true);

    setTimeout(() => {
      this.activePackets = [];
      while (this.packetsGroup.children.length > 0) {
        this.packetsGroup.remove(this.packetsGroup.children[0]);
      }
      onComplete?.(true);
    }, 2200);
  }

  public spawnCelebration() {
    sound.playVictory();
    for (let i = 0; i < 45; i++) {
      const colors = [0x10b981, 0xf59e0b, 0x38bdf8, 0xa855f7];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 8;
      this.spawnParticleBurst(x, 1 + Math.random() * 3, z, color);
    }
  }

  private spawnParticleBurst(x: number, y: number, z: number, colorHex: number) {
    const pCount = 12;
    const geo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < pCount; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.8,
        Math.random() * 4.5 + 1,
        (Math.random() - 0.5) * 3.8
      );
      p.userData = { velocity: vel, life: 1.0 };
      this.particlesGroup.add(p);
    }
  }

  private tick = () => {
    if (this.isDestroyed) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsedTime += delta;

    // Keyboard WASD / Arrow camera control
    if (this.heldKeys.size > 0) {
      const rotSpeed = 1.4 * delta;
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) {
        this.orbitAngle -= rotSpeed;
        this.updateCameraOrbit(this.orbitAngle);
      }
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) {
        this.orbitAngle += rotSpeed;
        this.updateCameraOrbit(this.orbitAngle);
      }
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) {
        this.orbitRadius = Math.max(12, this.orbitRadius - 8 * delta);
        this.updateCameraOrbit(this.orbitAngle);
      }
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) {
        this.orbitRadius = Math.min(34, this.orbitRadius + 8 * delta);
        this.updateCameraOrbit(this.orbitAngle);
      }
    }

    // Smooth Camera Exponential Damping
    this.currentCameraPos.x = THREE.MathUtils.damp(this.currentCameraPos.x, this.targetCameraPos.x, 5.5, delta);
    this.currentCameraPos.y = THREE.MathUtils.damp(this.currentCameraPos.y, this.targetCameraPos.y, 5.5, delta);
    this.currentCameraPos.z = THREE.MathUtils.damp(this.currentCameraPos.z, this.targetCameraPos.z, 5.5, delta);
    this.camera.position.copy(this.currentCameraPos);

    this.cameraLookAt.x = THREE.MathUtils.damp(this.cameraLookAt.x, this.targetLookAt.x, 6.0, delta);
    this.cameraLookAt.y = THREE.MathUtils.damp(this.cameraLookAt.y, this.targetLookAt.y, 6.0, delta);
    this.cameraLookAt.z = THREE.MathUtils.damp(this.cameraLookAt.z, this.targetLookAt.z, 6.0, delta);
    this.camera.lookAt(this.cameraLookAt);

    // Animate Mechanical Sub-Assemblies (cooling fans, radar dishes, levitating cores)
    this.componentsGroup.children.forEach(group => {
      group.children.forEach(part => {
        if (part.userData?.spinY) {
          part.rotation.y += delta * part.userData.spinY;
        }
        if (part.userData?.bobY) {
          part.position.y = (part.userData.baseY || 0.9) + Math.sin(this.elapsedTime * 3.0) * 0.06;
        }
      });
    });

    // Animate Glowing Target Tile Rings
    this.targetMarkersGroup.children.forEach(marker => {
      const ring = marker.getObjectByName('target_ring');
      if (ring) {
        const s = 1 + Math.sin(this.elapsedTime * 4.0) * 0.08;
        ring.scale.set(s, s, 1);
      }
    });

    this.animatePackets(delta);

    for (let i = this.particlesGroup.children.length - 1; i >= 0; i--) {
      const p = this.particlesGroup.children[i] as THREE.Mesh;
      p.userData.life -= delta * 1.6;
      if (p.userData.life <= 0) {
        this.particlesGroup.remove(p);
      } else {
        p.position.addScaledVector(p.userData.velocity, delta);
        p.userData.velocity.y -= 9.8 * delta;
        p.scale.setScalar(p.userData.life);
      }
    }

    this.updateHoverMarker();

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private updateHoverMarker() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.raycaster.ray.intersectPlane(this.groundPlane, this.groundRayTarget)) {
      const gx = Math.round(this.groundRayTarget.x / 1.4);
      const gz = Math.round(this.groundRayTarget.z / 1.4);

      if (gx >= -7 && gx <= 7 && gz >= -3 && gz <= 3) {
        this.hoverMarker.visible = true;
        this.hoverMarker.position.set(gx * 1.4, 0.025, gz * 1.4);
        return;
      }
    }
    this.hoverMarker.visible = false;
  }

  private animatePackets(delta: number) {
    while (this.packetsGroup.children.length > 0) {
      this.packetsGroup.remove(this.packetsGroup.children[0]);
    }

    const pktGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const matOk = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const matDrop = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    this.activePackets.forEach(pkt => {
      const maxProg = pkt.stopAtProgress ?? 1.0;
      pkt.progress += delta * 1.05;

      const fromMesh = this.componentMeshMap.get(pkt.fromId);
      const toMesh = this.componentMeshMap.get(pkt.toId);
      if (!fromMesh || !toMesh) return;

      const p1 = fromMesh.position.clone().add(new THREE.Vector3(0, 0.28, 0));
      const p2 = toMesh.position.clone().add(new THREE.Vector3(0, 0.28, 0));

      if (pkt.progress >= maxProg) {
        if (maxProg < 1.0) {
          const hitPos = p1.clone().lerp(p2, maxProg);
          this.spawnParticleBurst(hitPos.x, 0.55, hitPos.z, 0xef4444);
        }
        pkt.progress = 0;
      }

      const currentPos = p1.lerp(p2, pkt.progress);
      currentPos.y += Math.sin(pkt.progress * Math.PI) * (0.4 + p1.distanceTo(p2) * 0.06);

      const mesh = new THREE.Mesh(pktGeo, pkt.color === '#ef4444' ? matDrop : matOk);
      mesh.position.copy(currentPos);
      this.packetsGroup.add(mesh);
    });
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
