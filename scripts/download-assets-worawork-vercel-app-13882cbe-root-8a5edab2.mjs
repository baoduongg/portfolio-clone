import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://worawork.vercel.app";
const OUT = "public/sites/worawork-vercel-app-13882cbe/root-8a5edab2";

const files = [
  "Icons/ArrowLeft.webp","Icons/ArrowRight.webp","Icons/ArrowDown.webp","Icons/Blender.webp","Icons/CSS.webp","Icons/CSharp.webp",
  "Icons/Email.webp","Icons/Godot.webp","Icons/HTML.webp","Icons/Help_Interact.webp","Icons/Help_Interact_Mobile.webp",
  "Icons/Help_Move.webp","Icons/Help_Move_Mobile.webp","Icons/Help_Run.webp","Icons/Help_Run_Mobile.webp","Icons/Help_Zoom.webp",
  "Icons/Help_Zoom_Mobile.webp","Icons/IG.webp","Icons/JavaScript.webp","Icons/MailMarker.webp","Icons/Marker.webp","Icons/Python.webp",
  "Icons/QuestionMark.webp","Icons/React.webp","Icons/SketchUp.webp","Icons/SpeakerOff.webp","Icons/SpeakerOn.webp",
  "Icons/SubstanceDesigner.webp","Icons/SubstancePainter.webp","Icons/Unity.webp","Icons/UnrealEngine.webp","Icons/X.webp",
  "Icons/worawork.webp",
  "Images/AbstractSpace1.webp","Images/AbstractSpace2.webp","Images/AbstractSpace3.webp","Images/AbstractSpace4.webp",
  "Images/AbstractSpace5.webp","Images/AbstractSpace6.webp","Images/DefaultCube1.webp","Images/DefaultCube2.webp",
  "Images/DefaultCube3.webp","Images/Drawing1.webp","Images/Drawing3.webp","Images/Drawing4.webp","Images/Drawing5.webp",
  "Images/Drawing6.webp","Images/Drawing7.webp","Images/GameLand1.webp","Images/GameLand2.webp","Images/GameLand3.webp",
  "Images/GameLand4.webp","Images/GameLand5.webp","Images/GameLand6.webp","Images/InteriorCube2.webp","Images/InteriorCube3.webp",
  "Images/InteriorCube4.webp","Images/Miniature1.webp","Images/Miniature2.webp","Images/Miniature3.webp","Images/Miniature4.webp",
  "Images/Miniature5.webp","Images/Miniature6.webp","Images/NFT1.1.webp","Images/NFT1.2.webp","Images/NFT1.3.webp",
  "Images/NFT2.1.webp","Images/NFT2.2.webp","Images/NFT2.3.webp","Images/NineToFive1.webp","Images/NineToFive2.webp",
  "Images/NineToFive3.webp","Images/NineToFive5.webp","Images/NineToFive6.webp","Images/NineToFive7.webp","Images/Note1.webp",
  "Images/Note2.webp","Images/Note3.webp","Images/Note4.webp","Images/Note5.webp","Images/Note6.webp","Images/Note7.webp",
  "Images/Note8.webp","Images/Painting1.webp","Images/Painting2.webp","Images/Painting3.webp","Images/Pic1.webp",
  "Images/Pic2.webp","Images/Pic3.webp","Images/Pic6.webp","Images/Pic7.webp","Images/Pic8.webp","Images/Pic9.webp",
  "Images/Pic10.webp","Images/Pic11.webp","Images/Pic12.webp","Images/Pic13.webp","Images/Pic14.webp","Images/Pic15.webp",
  "Images/Pic16.webp","Images/Pic17.webp","Images/Pic18.webp","Images/Pic19.webp","Images/Pic20.webp",
  "Images/StylizedWorld1.webp","Images/StylizedWorld2.webp","Images/StylizedWorld4.webp","Images/Tamagotchi1.webp",
  "Images/Tamagotchi2.webp","Images/Tamagotchi3.webp","Images/WTB1.webp","Images/WTB2.webp","Images/WTB3.webp",
  "Images/WTB4.webp","Images/WTB5.webp","Images/WTB6.webp",
  "Models/Duck.glb","Models/Models.glb","Models/Player.glb",
  "Sounds/BGMusic.mp3","Sounds/BellClockSound.mp3","Sounds/BuPopSound.mp3","Sounds/CheerGoSound.mp3","Sounds/DayAmbient.mp3",
  "Sounds/DoorOpening.mp3","Sounds/DuckQuack.mp3","Sounds/HiSound1.mp3","Sounds/HiSound2.mp3","Sounds/HubSound.mp3",
  "Sounds/LightSwitchSound.mp3","Sounds/PopSound3.mp3","Sounds/WalkGrass.mp3","Sounds/WalkWood.mp3","Sounds/WooSound.mp3",
  "Sounds/YawningSound.mp3",
  "Textures/bubble.webp","Textures/circle.webp",
  "Fonts/Coiny-Regular.ttf",
  "favicon.ico",
];

async function downloadOne(rel) {
  const url = `${BASE}/${rel}`;
  const dest = path.join(OUT, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL ${res.status} ${url}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`OK ${rel} (${buf.length} bytes)`);
  return true;
}

async function main() {
  const batchSize = 6;
  let failures = 0;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(downloadOne));
    failures += results.filter((r) => !r).length;
  }
  console.log(`Done. ${files.length - failures}/${files.length} succeeded.`);
  if (failures > 0) process.exit(1);
}

main();
