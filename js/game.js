/* ==========================================================================
   THE BELL NEVER RINGS — game core
   First-person low-poly retro 3D. Broad daylight. No flashlight: the horror
   is that everything is bright, cheerful, empty, and stuck at 4:47 PM.

   Sections: constants · story · map · level geometry · save · state · input
             player · interaction · Mr. Mop · Patty · bell schedule · flow
             HUD · render · UI wiring · boot
   ========================================================================== */
(function(){
"use strict";

const $ = id => document.getElementById(id);

/* ============================== constants ============================== */
const T = 2.0;          // one tile = 2 metres
const WALL_H = 3.0;     // ceiling height (metres)
const EYE = 1.35;       // Milo is ten years old
const MW = 48, MH = 32;
const TW = 12, TH = 12; // bell tower map
const VIEW_TILES = 11;   // 22 m: exactly the fog distance, so nothing beyond is ever visible  // draw radius in tiles
const REACH = 2.9;      // interaction reach (metres)

const DIFF = {
  easy:  {label:"Easy",   patrol:1.55, chase:3.55, patty:1.35, stam:0.7, slips:4, messBonus:2, period:120},
  normal:{label:"Normal", patrol:1.85, chase:4.05, patty:1.55, stam:1.0, slips:3, messBonus:1, period:100},
  hard:  {label:"Hard",   patrol:2.15, chase:4.55, patty:1.80, stam:1.3, slips:2, messBonus:0, period:82}
};
const WALK_SPEED = 2.95, RUN_SPEED = 5.35, ACCEL = 14;

/* tiles: 0 floor · 1 wall · 2 door · 3 exit · 4 locker · 5 desk · 6 chair
   8 bookcase · 9 plant · 10 vending · 11 toilet · 12 sink · 14 trash
   15 puddle(walkable) · 17 gym mat · 18 caf table · 22 tower door
   23 trophy case · 24 water fountain · 25 secret bookcase */
const SOLID = new Set([1,4,5,6,8,9,10,11,12,14,17,18,23,24,25]);
const WALKABLE = new Set([0,15,19]);

let grid=[], doors={}, lockers=[], props=[], decor=[], windows=[], sunTiles={};
let curMap="school";

/* ============================== story ============================== */
const PAGES = [
 {head:"DIARY PAGE 1 — SEPTEBER 9", body:"Mom says Riverside is a good school. It smells like new floor wax and pencil shavings. I put my name on everything so it won't get lost.\n\nMy name is Milo. My name is Milo. My name is Milo.\n\nI wrote it eleven times. Just in case."},
 {head:"DIARY PAGE 2 — OCTOBER 2", body:"The janitor is nice. He lets me sit in the library when it rains. He hums while he mops. I asked him what song it is and he said he doesn't know, that it was already in the building when he got here.\n\nHe said the building sings and he just helps it along."},
 {head:"DIARY PAGE 3 — OCTOBER 21", body:"Nobody came to school today except me. I counted the coats on the hooks. There were thirty-one.\n\nI counted them again. There were thirty-two.\n\nI didn't hang mine up."},
 {head:"DIARY PAGE 4 — NOVEMBER 4", body:"Mrs. Denton says the bell is broken and we'll use the clock instead. But the clock says 4:47 and the clock has said 4:47 since October.\n\nI asked if that means school is over. She said yes.\n\nThen she said no. Then she wasn't there anymore."},
 {head:"DIARY PAGE 5 — NOVEMBER 12", body:"He cleans the same hallway every day. The one by the gym. It's already clean. It's the cleanest place in the whole school.\n\nToday I saw him mop a spot and then stop and look at it for a long time.\n\nI don't think he sees the floor."},
 {head:"DIARY PAGE 6 — DECEMBER 1", body:"I found the tapes in the A/V room. Somebody filmed the whole school for a week. In every single tape, at some point, a man walks past the camera carrying a mop.\n\nIn one of them he stops and looks right into the lens.\n\nHe is waving. He is waving at me. I was not born yet when that tape was made."},
 {head:"DIARY PAGE 7 — DECEMBER 18", body:"The last day before winter break. There was a party. I made a wish on the candles.\n\nI wished school would never end.\n\nSomething in the cafeteria window waved back at me. I have been writing this page for a very long time. My pencil is not getting shorter."},
 {head:"DIARY PAGE 8 — NO DATE", body:"If you are reading this you are still here. So am I. We are all still here.\n\nThe bell never rang. That's the trick. A school day ends when the bell rings, and the bell never rang, so the day is still going. It has been going for twenty-eight years.\n\nGo up the stairs in the east hall. Ring it.\n\nThen run. He will not like being told the day is over.\n\n— M."}
];
const TAPES = [
 {head:"FOUND TAPE — \"SAFETY FIRST\"", body:"[VHS · RIVERSIDE ELEMENTARY · 1997]\n\nA man in a janitor's uniform stands in an empty hallway. Bright sun through the windows. He smiles at the camera for eleven seconds before he speaks.\n\n\"Welcome to Riverside. Remember: no running in the halls.\"\n\nThe tape runs out four minutes later. He has not stopped smiling. He has not blinked."},
 {head:"FOUND TAPE — \"THE CLOCK\"", body:"[VHS · 1997]\n\nA classroom. Thirty-one children. A teacher asks, \"Now class — what time is it?\"\n\nEvery child answers at once: \"Four forty-seven.\"\n\nThe camera pans to the clock. It reads 4:47. The camera pans back.\n\nThere are thirty-two children now. Nobody moves. Nobody seems to notice."},
 {head:"FOUND TAPE — \"NEWS REPORT\"", body:"[VHS · NOVEMBER 1997]\n\n\"...the school remains closed pending investigation. Custodial staff member Mr. ——— has not been seen since Tuesday. Police stress there is no indication of—\"\n\nThe tape warps. The anchor's face stretches sideways. Very calmly, she says:\n\n\"He's in the walls now. He's in the walls now. He's in the—\"\n\nStatic. Then the sound of a mop, wrung out."},
 {head:"FOUND TAPE — \"THE PARTY\"", body:"[VHS · DECEMBER 1997]\n\nA birthday party in the cafeteria. Balloons. A cake with nine candles. A boy leans in.\n\nThrough the serving window, behind him, a tall figure stands perfectly still in the bright daylight.\n\nThe boy whispers his wish. The camera zooms to his lips:\n\n\"I wish school would never end.\"\n\nThe figure raises one hand and waves. Every child in the cafeteria turns to look at the camera at exactly the same moment."},
 {head:"FOUND TAPE — \"LAST TAPE\"", body:"[VHS · LABELLED IN CRAYON]\n\nAn empty classroom. Bright sun. A diary on a desk. A child's hand takes it.\n\nThe camera follows the diary down the hallway. The operator is breathing hard. Somewhere ahead, a mop squeaks. A man begins to hum.\n\nThe operator whispers: \"He's behind me, isn't he.\"\n\nA voice, very close, very kind: \"There you are.\"\n\nThe tape ends. The breathing does not."}
];
const LORE = {
 vending1:"You got a soda. (+1) The machine hums happily. Sunlight on its glass.",
 vending2:"Another soda. The machine is being generous today.",
 vending3:"Empty. It was never full. You can tell by the way the light goes through it.",
 clock1:"The clock reads 4:47. Bright sun. Dust in the air.",
 clock2:"The clock reads 4:47.",
 clock3:"The clock reads 4:47. It has always read 4:47.",
 clock4:"The clock reads 4:48.\n\nYou look away. When you look back it reads 4:47. The second hand is moving backwards, very slowly, like it is embarrassed.",
 mirror:"You look in the mirror.\n\nBehind you, a tall man stands in the doorway holding a mop.\n\nYou spin around. Bright empty hallway. Sunlight. Nothing.\n\nWhen you look back at the mirror, the hallway in it is empty too. But the mop is still there, leaning against the wall, dripping.",
 radio:"Static... then a music box. Then a voice, mid-sentence: \"—and remember, children, the day ends when the—\"\n\nStatic. The radio is unplugged. The cord is on the floor, coiled neatly, like something tidied up after itself.",
 extinguisher:"\"DO NOT PULL.\"\n\nThe sign is written in crayon. In a child's handwriting. Underneath, in the same hand: \"he does not like the loud one\".",
 blackboard:"2 + 2 = ???\n\nUnderneath, smaller: \"he hums when he's close.\"\n\nUnder that, even smaller: \"he cleans what you spill. he has to. it's his job.\"\n\nSomebody has erased a fourth line. You can still read the ghost of it: \"the bell\".",
 trash:"A crumpled paper ball. A dried apple core. A battery— no. A small brass key, bent. It fits nothing.",
 plant:"A note tucked in the soil: \"He can't see you if you're still. He can HEAR you if you're not.\"\n\nThe plant is plastic. It has been watered recently.",
 office:"A note on the principal's desk, typed:\n\n\"SCHOOL CLOSED UNTIL FURTHER NOTICE.\"\n\nThe date on it is tomorrow. The ink is still wet. There is a mug of coffee beside it. Steam is coming off the coffee.",
 trophy:"Riverside Gators. First place, attendance, 1994 through 1997.\n\nPerfect attendance. Every year. Every single student.\n\nThe last trophy has no year on it. It just says: STILL HERE.",
 fountain:"The water fountain works. The water is cold and tastes like a penny.\n\nFor one second the reflection in the basin is not yours. It is taller.",
 bookcase:"A shelf of encyclopedias. Volume M is missing. Somebody has written on the inside of the shelf, in pencil:\n\n\"MILO WAS HERE. MILO IS HERE.\"",
 mural:"A crayon mural: a sun with a smiling face, two children, a school.\n\nThere is a third child drawn behind the school, mostly erased. Whoever drew him pressed hard enough to tear the paper.",
 yearbook:"The 1997 yearbook. Every page has the same photograph: an empty hallway, bright with sun.\n\nOn the last page somebody has taped in a class photo. Thirty-one children. One janitor.\n\nEvery face has been carefully, patiently coloured out with a black marker. Except one.",
 lostfound:"The lost and found box. One red mitten. Two scarves. A watch stopped at 4:47.\n\nAt the bottom: a diary with your name on it. The pages are blank. All eight of them are blank.\n\nYou close the box quickly.",
 nook:"A child's hiding place, behind the library shelves.\n\nCrayon drawings taped to the wall. A sun. A school. A tall man with a mop.\n\nIn every single drawing, he is facing the viewer.\n\nThere is a sleeping bag here. It is warm.",
 closet:"The janitor's closet. Mops, wrung and hung to dry in a neat row. A bucket. A folding chair.\n\nOn the shelf: thirty-one polaroids, one for each coat hook in Room 101.\n\nEach one is a picture of an empty hallway, bright with sun.\n\nOn the back of the last one, in pencil: \"not yet\".",
 gym:"The gymnasium. Sunlight comes in high windows and lands in squares on the floor.\n\nThe scoreboard reads 4:47 — 4:47.\n\nIt has been tied for twenty-eight years.",
 stage:"The stage where assemblies happen. There is a microphone stand, and a bell rope that goes up through a hole in the ceiling.\n\nSomebody has tied the rope off with a chain. The chain is new. The chain is not."
};
const PA_LINES = [
 "Attention. This is a reminder that the day is not over.",
 "Attendance is at one hundred percent. It has been at one hundred percent.",
 "Will the custodian please report to the east hall. The custodian is already in the east hall.",
 "Reminder: the bell is not working. Please ignore the time. Please ignore the time.",
 "Lost and found: one red mitten. One diary. One boy.",
 "There will be an assembly. There will always be an assembly.",
 "Students are reminded that running in the halls attracts attention.",
 "The sun is shining. It is a beautiful day. It is a beautiful day. It is a—"
];
const PATTY_SPOT = [
 "\"There you are! You're not supposed to be in the hall.\"",
 "\"Excuse me! EXCUSE me. Do you have a pass?\"",
 "\"Hall monitor duty. Stop right there.\"",
 "\"I'm writing this down. I'm writing ALL of this down.\"",
 "\"It's not recess. It's never recess.\""
];
const PATTY_OK = [
 "\"...oh. You have a pass. That's fine. That's FINE.\"",
 "\"Hmph. Properly laminated. Go on then.\"",
 "\"I'll allow it. Don't let me catch you running.\"",
 "\"See? Rules. Rules are nice. Rules keep it 4:47.\""
];
const PATTY_SLIP = [
 "\"TARDY. That's a slip. That's your—\" she counts on her fingers, loses her place.",
 "\"Slip! Slip! You're accumulating!\"",
 "\"Detention is forever, you know. Forever and ever.\"",
 "\"I have to tell Mr. Mop. I HAVE to. It's in the handbook.\""
];
const MOP_CLEAN = [
 "Mr. Mop stops. He looks at the mess. He looks at you. He looks at the mess.\n\n\"Somebody made a mess,\" he says, and his voice goes soft and far away, and he walks toward it. He has to. It's his job.",
 "\"A mess,\" Mr. Mop says. \"A mess in my hallway.\"\n\nHe forgets about you entirely. The mop goes back and forth. Back and forth. He is humming.",
 "\"Now look at that,\" he says, delighted and horrified at the same time. \"Now LOOK at that.\"\n\nHe starts cleaning. You have a little while."
];
const MOP_SEE = [
 "\"There you are.\"",
 "\"Oh! A student. It's after hours.\"",
 "\"Don't run. You'll track it in.\"",
 "\"I've been looking for you. We all have.\"",
 "\"Let's get you cleaned up.\""
];
const MOP_CLEANING = [
 "\"...just a little spill, that's all, just a little spill...\"",
 "\"...back and forth, back and forth, that's the whole job...\"",
 "\"...nobody ever thanks the floor, nobody ever thanks the floor...\"",
 "\"...four forty-seven, four forty-seven, that's the whole song...\""
];

/* ============================== map ============================== */
function buildMap(name){
  grid=[]; doors={}; lockers=[]; props=[]; decor=[]; windows=[]; sunTiles={};
  snapCache=null;
  curMap = name;
  const W = name==="tower" ? TW : MW, H = name==="tower" ? TH : MH;
  for(let y=0;y<H;y++) grid.push(new Array(W).fill(0));
  const set=(x,y,t)=>{ if(x>=0&&y>=0&&x<W&&y<H) grid[y][x]=t; };
  const at=(x,y)=> (x<0||y<0||x>=W||y>=H) ? 1 : grid[y][x];
  const hwall=(x1,x2,y,gaps)=>{ for(let x=x1;x<=x2;x++) set(x,y,(gaps&&gaps.includes(x))?2:1); };
  const vwall=(y1,y2,x,gaps)=>{ for(let y=y1;y<=y2;y++) set(x,y,(gaps&&gaps.includes(y))?2:1); };
  const room=(x0,y0,x1,y1,floorT)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) set(x,y,floorT||0); };
  const P=(x,y,mesh,yaw,scale,tag)=> props.push({x,y,mesh,yaw:yaw||0,scale:scale||1,tag:tag||null});
  const D=(x,y,type,face,tag)=> decor.push({x,y,type,face,tag:tag||null});

  if(name==="tower"){
    for(let x=0;x<TW;x++){ set(x,0,1); set(x,TH-1,1); }
    for(let y=0;y<TH;y++){ set(0,y,1); set(TW-1,y,1); }
    room(1,1,TW-2,TH-2,15);
    /* stairwell opening back down to the east hall */
    set(6,TH-1,2); doors["6,11"]={x:6,y:11,open:true,tower:true};
    /* the bell hangs from a beam at the north end */
    P(6,3,"bellMount",0,1,"bellmount");
    P(6,3,"bell",0,1,"bell");
    P(6,3.05,"bellRope",0,1,"rope");
    P(3,5,"stairs",Math.PI/2,1.2,"stairs");
    P(9,5,"trash",0,1,"trash");
    P(2,8,"plant",0,1,"plant");
    D(4,0,"window","s"); D(8,0,"window","s");
    D(6,0,"sign","s","BELL TOWER");
    D(1,4,"window","e"); D(1,8,"window","e");
    return;
  }

  /* -------- exterior -------- */
  for(let x=0;x<MW;x++){ set(x,0,1); set(x,MH-1,1); }
  for(let y=0;y<MH;y++){ set(0,y,1); set(MW-1,y,1); }

  /* -------- perimeter hallway (daylight ring) -------- */
  room(1,1,MW-2,3);            // north hall
  room(1,MH-4,MW-2,MH-2);      // south hall
  room(1,4,3,MH-5);            // west hall
  room(MW-4,4,MW-2,MH-5);      // east hall

  /* -------- interior ring wall -------- */
  vwall(4,27,4,[16]); vwall(4,27,43,[16]);
  hwall(4,43,4,[9,17,24,31,40]); hwall(4,43,27,[9,17,24,31,40]);

  /* -------- interior: main hall rows 14..17 -------- */
  room(5,14,42,17);
  /* north rooms y5..12, wall row 13 */
  hwall(5,42,13,[8,15,18,24,32,40]);
  vwall(5,12,13); vwall(5,12,16,[8]); vwall(5,12,20); vwall(5,12,28); vwall(5,12,37);
  room(5,5,12,12);                 // Room 101
  room(14,5,15,12,15);             // girls' bathroom
  room(17,5,19,12,15);             // boys' bathroom
  room(21,5,27,12);                // Room 102
  room(29,5,36,12);                // library
  room(38,5,42,12);                // A/V room
  /* south rooms y19..26, wall row 18 */
  hwall(5,42,18,[10,22,28,38]);
  vwall(19,26,17); vwall(19,26,33);
  room(5,19,16,26);                // cafeteria
  room(18,19,32,26);               // gym
  room(34,19,42,26);               // office suite
  vwall(19,23,38,[22]); room(39,19,42,23);   // principal's office
  hwall(34,37,22,[35]);                      // nurse / records nook
  room(34,23,37,26);
  /* janitor's closet in the gym's east corner */
  vwall(24,26,30,[25]); hwall(30,32,24);
  room(31,25,32,26);

  /* -------- lockers: rows along the main hall -------- */
  const lockerRow=(y,xs)=>xs.forEach(x=>{ set(x,y,4); lockers.push({x,y}); });
  lockerRow(14,[6,7,8,9,10,11, 14,15,16,17,18,19, 23,24,25,26,27,28, 32,33,34,35,36,37, 40,41]);
  lockerRow(17,[12,13, 20,21,22, 29,30,31, 38,39, 42]);
  /* perimeter hall lockers */
  lockerRow(3,[6,7,8, 20,21,22, 34,35,36]);
  lockerRow(28,[10,11,12, 26,27,28, 40,41]);
  [ [1,8],[1,9],[1,10],[1,20],[1,21],[1,22] ].forEach(p=>{ set(p[0],p[1],4); lockers.push({x:p[0],y:p[1]}); });
  [ [46,8],[46,9],[46,10],[46,20],[46,21],[46,22] ].forEach(p=>{ set(p[0],p[1],4); lockers.push({x:p[0],y:p[1]}); });

  /* -------- windows on exterior walls (broad daylight) -------- */
  for(let x=2;x<=45;x+=3){ if(x===23||x===24) continue; windows.push({x,y:0,face:"s"}); windows.push({x,y:MH-1,face:"n"}); }
  for(let y=2;y<=29;y+=3){ windows.push({x:0,y,face:"e"}); windows.push({x:MW-1,y,face:"w"}); }

  /* -------- front doors (exit) on the south wall -------- */
  set(23,MH-1,3); set(24,MH-1,3);
  /* -------- bell tower door: far east end of the north hall -------- */
  set(MW-1,2,22);

  /* -------- secret nook in the library -------- */
  set(29,5,0); set(30,5,0); set(29,6,0); set(30,6,0);
  set(31,5,8); set(31,7,8); set(29,7,8); set(30,7,8); set(31,6,25);

  /* -------- props: classrooms -------- */
  const desks=(x0,y0,x1,y1)=>{ for(let y=y0;y<=y1;y+=2) for(let x=x0;x<=x1;x+=2){ set(x,y,5); set(x+1,y,6); } };
  desks(6,7,11,11); desks(22,7,26,11); desks(39,7,41,11);
  P(9,5,"chalkboard",0,1); D(9,4,"chalkboard","s");
  D(24,4,"chalkboard","s"); D(40,4,"chalkboard","s");
  D(8,4,"clock","s"); D(24,13,"clock","n"); D(10,18,"clock","n");
  P(12,6,"plant",0,1); set(12,6,9);
  P(6,12,"trash",0,1); set(6,12,14);
  set(27,6,14); P(27,6,"trash",0,1);
  set(42,12,14); P(42,12,"trash",0,1);
  set(11,26,14); P(11,26,"trash",0,1);
  set(19,26,14); P(19,26,"trash",0,1);
  set(35,26,14); P(35,26,"trash",0,1);
  set(5,20,14); P(5,20,"trash",0,1);
  set(43,16,14); P(43,16,"trash",0,1);
  set(4,16,14); P(4,16,"trash",0,1);
  set(24,3,14); P(24,3,"trash",0,1);
  set(30,29,14); P(30,29,"trash",0,1);

  /* library */
  [[31,9],[33,9],[35,9],[31,11],[33,11],[35,11]].forEach(p=>{ set(p[0],p[1],8); P(p[0],p[1],"bookcase",0,1); });
  [[29,9],[29,11]].forEach(p=>{ set(p[0],p[1],8); P(p[0],p[1],"bookcase",Math.PI/2,1); });
  set(32,6,18); P(32,6,"caftable",0,0.8); set(33,6,6); P(33,6,"chair",0,1);
  set(36,12,23); P(36,12,"trophy",-Math.PI/2,1);

  /* A/V room */
  set(39,6,18); P(39,6,"caftable",0,0.9); set(41,6,18); P(41,6,"caftable",0,0.9);
  set(39,10,18); P(39,10,"caftable",0,0.9); set(41,10,18); P(41,10,"caftable",0,0.9);
  D(42,5,"poster","w","A/V CLUB"); D(42,9,"speaker","w");

  /* bathrooms */
  [[14,6],[14,9],[15,6],[15,9]].forEach(p=>{ set(p[0],p[1],11); P(p[0],p[1],"toilet",Math.PI,1); });
  [[17,6],[17,9],[18,6],[18,9]].forEach(p=>{ set(p[0],p[1],11); P(p[0],p[1],"toilet",Math.PI,1); });
  set(14,12,12); P(14,12,"sink",0,1); set(15,12,12); P(15,12,"sink",0,1);
  set(17,12,12); P(17,12,"sink",0,1); set(18,12,12); P(18,12,"sink",0,1);
  D(15,4,"mirror","s"); D(18,4,"mirror","s");
  set(14,11,15); set(18,10,15); set(15,8,15);

  /* cafeteria */
  [[7,21],[10,21],[13,21],[7,24],[10,24],[13,24]].forEach(p=>{ set(p[0],p[1],18); P(p[0],p[1],"caftable",0,1); });
  set(16,20,10); P(16,20,"vending",Math.PI,1); set(16,21,10); P(16,21,"vending",Math.PI,1);
  set(6,26,24); P(6,26,"fountain",0,1);
  D(16,18,"sign","n","CAFETERIA");

  /* gym */
  [[19,20],[21,20],[23,20],[19,23],[21,23],[23,23]].forEach(p=>{ set(p[0],p[1],17); P(p[0],p[1],"gymmat",0,1); });
  set(25,26,23); P(25,26,"trophy",Math.PI,1);
  set(18,19,24); P(18,19,"fountain",Math.PI/2,1);
  D(24,18,"sign","n","GYMNASIUM");
  P(31,25,"bucket",0,1); P(31.6,25.4,"mop",0.4,1);
  set(32,26,8); P(32,26,"bookcase",Math.PI,1);
  D(31,24,"sign","n","JANITOR");

  /* office suite */
  desks(35,20,37,22);
  set(40,20,5); P(40,20,"desk",0,1.2); set(41,21,6); P(41,21,"chair",Math.PI,1);
  set(34,19,23); P(34,19,"trophy",Math.PI/2,1);
  set(42,26,9); P(42,26,"plant",0,1);
  D(42,20,"clock","w"); D(42,24,"poster","w","ATTENDANCE");
  D(38,18,"sign","n","OFFICE");
  set(35,26,24); P(35,26,"fountain",Math.PI,1);

  /* hall dressing */
  D(13,13,"sign","n","ROOM 101"); D(24,13,"sign","n","ROOM 102");
  D(32,13,"sign","n","LIBRARY"); D(40,13,"sign","n","A/V ROOM");
  D(15,13,"sign","n","GIRLS"); D(18,13,"sign","n","BOYS");
  D(22,27,"sign","s","TO STAIRS"); D(40,27,"sign","s","EAST HALL");
  D(6,0,"poster","s","SAFETY FIRST"); D(15,0,"poster","s","READ!");
  D(33,0,"mural","s"); D(42,0,"poster","s","4:47");
  D(2,10,"poster","e","GO GATORS"); D(2,22,"mural","e");
  D(45,14,"poster","w","BELL SCHEDULE"); D(45,26,"mural","w");
  D(20,31,"sign","n","FRONT DOORS"); D(27,31,"sign","n","FRONT DOORS");
  D(46,2,"sign","w","STAIRS");
  D(12,3,"clock","s"); D(28,3,"clock","s"); D(20,28,"clock","n");
  D(4,9,"speaker","e"); D(43,20,"speaker","w"); D(12,13,"speaker","n");
  set(44,3,24); P(44,3,"fountain",0,1);
  set(3,26,24); P(3,26,"fountain",-Math.PI/2,1);
  set(22,3,9); P(22,3,"plant",0,1);
  set(9,29,9); P(9,29,"plant",0,1);
  set(36,29,9); P(36,29,"plant",0,1);
  set(2,16,19); P(2,16,"extinguisher",Math.PI/2,1);
  set(45,16,19); P(45,16,"extinguisher",-Math.PI/2,1);
  set(14,29,19); P(14,29,"extinguisher",0,1);
  /* the front doors themselves */
  P(23.5,MH-1,"exitDoors",0,1,"exit");
  P(46.4,2,"doorMetal",-Math.PI/2,1,"towerdoor");

  /* doors get records (open/closed) */
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(grid[y][x]===2 && !doors[x+","+y]) doors[x+","+y]={x,y,open:false};
  }
}

function tileAt(tx,ty){
  const W = curMap==="tower"?TW:MW, H = curMap==="tower"?TH:MH;
  if(tx<0||ty<0||tx>=W||ty>=H) return 1;
  return grid[ty][tx];
}
function mapW(){ return curMap==="tower"?TW:MW; }
function mapH(){ return curMap==="tower"?TH:MH; }
function isSolidTile(t){ return SOLID.has(t); }
function isWalkable(tx,ty){
  const t=tileAt(tx,ty);
  if(WALKABLE.has(t)) return true;
  if(t===2||t===22){ const d=doors[tx+","+ty]; return !!(d&&d.open); }
  return false;
}
/* nearest walkable tile (BFS ring) — used so no pickup, patrol node or spawn
   can ever sit inside a prop; keeps the level data forgiving to edit */
let snapCache=null;
function snapWalk(tx,ty){
  if(isWalkable(tx,ty)) return [tx,ty];
  if(!snapCache) snapCache=new Map();
  const k=tx+","+ty;
  const hit=snapCache.get(k);
  if(hit) return hit;
  const W=mapW(), H=mapH();
  const seen=new Set([k]);
  let ring=[[tx,ty]];
  for(let r=1;r<=9;r++){
    const next=[];
    for(const [cx,cy] of ring){
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx, ny=cy+dy, nk=nx+","+ny;
        if(nx<0||ny<0||nx>=W||ny>=H||seen.has(nk)) continue;
        seen.add(nk);
        if(isWalkable(nx,ny)){ snapCache.set(k,[nx,ny]); return [nx,ny]; }
        next.push([nx,ny]);
      }
    }
    ring=next;
    if(!ring.length) break;
  }
  snapCache.set(k,[tx,ty]);
  return [tx,ty];
}

function dist(x1,y1,x2,y2){ return Math.hypot(x2-x1,y2-y1); }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function rand(a,b){ return a+Math.random()*(b-a); }
function choice(a){ return a[(Math.random()*a.length)|0]; }

function losBlocked(x1,y1,x2,y2){
  const steps=Math.max(1,Math.ceil(dist(x1,y1,x2,y2)/(T*0.35)));
  for(let i=1;i<steps;i++){
    const t=i/steps, px=x1+(x2-x1)*t, py=y1+(y2-y1)*t;
    const tx=Math.floor(px/T), ty=Math.floor(py/T), tile=tileAt(tx,ty);
    if(tile===1||tile===4||tile===8||tile===10||tile===25) return true;
    if(tile===2||tile===22){ const d=doors[tx+","+ty]; if(d&&!d.open) return true; }
  }
  return false;
}

/* BFS on the tile grid; doors count as passable (both sides can open them).
   Falls back to the closest reachable tile if the exact target is sealed. */
function findPath(sx,sy,tx,ty){
  if(sx===tx&&sy===ty) return [[sx,sy]];
  const W=mapW(), key=(x,y)=>y*W+x;
  const prev=new Map(), q=[[sx,sy]]; prev.set(key(sx,sy),null);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const passable=(x,y)=>{ const t=tileAt(x,y); return WALKABLE.has(t)||t===2||t===22; };
  let bestK=null, bestD=1e9;
  const build=k=>{ const p=[]; while(prev.get(k)!==null&&prev.get(k)!==undefined){ p.push([k%W,Math.floor(k/W)]); k=prev.get(k);} p.reverse(); return p; };
  while(q.length){
    const [cx,cy]=q.shift();
    if(cx===tx&&cy===ty) return build(key(tx,ty));
    const d=Math.abs(cx-tx)+Math.abs(cy-ty);
    if(d<bestD){ bestD=d; bestK=key(cx,cy); }
    for(const [dx,dy] of dirs){
      const nx=cx+dx, ny=cy+dy, k=key(nx,ny);
      if(prev.has(k)||!passable(nx,ny)) continue;
      prev.set(k,key(cx,cy)); q.push([nx,ny]);
    }
  }
  if(bestK!==null&&bestD<999) return build(bestK);
  return null;
}

/* ============================== level geometry ==============================
   Static world geometry is baked once per map into world-space quads, bucketed
   by tile so each frame only touches the tiles around and in front of the
   camera. Ceiling light fixtures are carved out of the ceiling tile (four
   border strips + the panel) so nothing is ever coplanar -> no z-fighting. */
/* wall-face codes for per-quad backface culling (see Level.addQuad) */
const FACE={n:1,s:2,e:3,w:4};
/* Wall-hugging fixtures, and how far back from the tile centre they stand so
   they sit flush against the wall behind them instead of floating mid-tile
   (1 m half-tile minus half the model's depth). */
const HUG_BACK={4:0.81, 8:0.79, 25:0.79, 10:0.62, 23:0.68};
/* Free-standing furniture: the floor is drawn and no wall faces are built */
const FURNITURE=new Set([5,6,9,11,12,14,17,18,19,24]);

const TILE_MODEL = {
  4:"locker", 5:"desk", 6:"chair", 8:"bookcase", 9:"plant", 10:"vending",
  11:"toilet", 12:"sink", 14:"trash", 17:"gymmat", 18:"caftable",
  23:"trophy", 24:"fountain", 25:"bookcase"
};
const POSTERS = {
  "SAFETY FIRST":["NO RUNNING","IN THE HALLS","PLEASE WALK"],
  "READ!":["READ A BOOK","TODAY","AND EVERY DAY","4:47 PM"],
  "4:47":["THE TIME IS","4:47 PM","THE TIME IS","4:47 PM"],
  "GO GATORS":["RIVERSIDE","GATORS","1997","CHAMPS"],
  "BELL SCHEDULE":["PERIOD 1 4:47","PERIOD 2 4:47","RECESS 4:47","DISMISSAL 4:47"],
  "ATTENDANCE":["100%","PERFECT","ATTENDANCE","FOREVER"]
};

const Level = {
  quads:[], buckets:new Map(), props:[], built:false, texCache:{},
  scratch:[[0,0,0],[0,0,0],[0,0,0],[0,0,0]],

  tex(name){
    if(this.texCache[name]!==undefined) return this.texCache[name];
    let i = R3.texIndex(name);
    if(i < 0){
      let t = null;
      if(name.indexOf("sign:")===0) t = Tex.sign(name.slice(5));
      else if(name.indexOf("poster:")===0){
        const key=name.slice(7), lines=POSTERS[key]||["RIVERSIDE","ELEMENTARY","1997"];
        t = Tex.poster(key, lines);
      }
      if(t){ i = R3.setTexture(name, t); } else { i = -1; }
    }
    this.texCache[name]=i;
    return i;
  },

  /* face: 0 = no culling (floors, ceilings, props) · 1 = looks north (-Z)
     2 = looks south (+Z) · 3 = looks east (+X) · 4 = looks west (-X).
     Wall quads carry it so the three faces of a tile that point away from the
     camera are never sent to the rasteriser. */
  addQuad(pts, uvScale, shade, texName, bx, by, face){
    const q = {
      p: new Float32Array([pts[0][0],pts[0][1],pts[0][2], pts[1][0],pts[1][1],pts[1][2],
                           pts[2][0],pts[2][1],pts[2][2], pts[3][0],pts[3][1],pts[3][2]]),
      uv: uvScale, sh: shade, tex: this.tex(texName), bx, by, f: face||0
    };
    const k = bx+","+by;
    let arr = this.buckets.get(k);
    if(!arr){ arr=[]; this.buckets.set(k,arr); }
    arr.push(this.quads.length);
    this.quads.push(q);
  },

  build(){
    this.quads=[]; this.buckets=new Map(); this.props=[]; this.built=true;
    const W=mapW(), H=mapH();
    const winAt={};
    windows.forEach(w=>{ winAt[w.x+","+w.y+":"+w.face]=w; });

    /* floor + ceiling for every walkable tile */
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const t=grid[y][x];
      const walkable = WALKABLE.has(t) || t===2 || t===22 || t===3 || HUG_BACK[t]!==undefined || FURNITURE.has(t);
      if(!walkable) continue;
      const x0=x*T, x1=x0+T, z0=y*T, z1=z0+T;
      /* floor */
      let fsh = 0.97;
      if(sunTiles[x+","+y]) fsh = sunTiles[x+","+y];
      const ftex = (curMap==="tower") ? "floor_gym" : floorTexFor(x,y,t);
      this.addQuad([[x0,0,z1],[x1,0,z1],[x1,0,z0],[x0,0,z0]],[1,1],fsh,ftex,x,y);
      /* ceiling: light fixture carved out of the tile */
      const isLight = (x%4===1)&&(y%4===1);
      if(isLight){
        const m0=x0+T*0.22, m1=x1-T*0.22, n0=z0+T*0.22, n1=z1-T*0.22;
        this.addQuad([[x0,WALL_H,z1],[x1,WALL_H,z1],[x1,WALL_H,n1],[x0,WALL_H,n1]],[1,0.3],1.0,"ceil_tile",x,y);
        this.addQuad([[x0,WALL_H,n0],[x1,WALL_H,n0],[x1,WALL_H,z0],[x0,WALL_H,z0]],[1,0.3],1.0,"ceil_tile",x,y);
        this.addQuad([[m0,WALL_H,n0],[m0,WALL_H,n1],[m1,WALL_H,n1],[m1,WALL_H,n0]],[0.3,1],1.0,"ceil_tile",x,y);
        this.addQuad([[m1,WALL_H,n0],[m1,WALL_H,n1],[m0,WALL_H,n1],[m0,WALL_H,n0]],[0.3,1],1.0,"ceil_tile",x,y);
        this.addQuad([[m0,WALL_H-0.01,n1],[m1,WALL_H-0.01,n1],[m1,WALL_H-0.01,n0],[m0,WALL_H-0.01,n0]],[1,1],1.34,"ceil_light",x,y);
      } else {
        this.addQuad([[x0,WALL_H,z1],[x1,WALL_H,z1],[x1,WALL_H,z0],[x0,WALL_H,z0]],[1,1],1.0,"ceil_tile",x,y);
      }
    }

    /* walls: every solid face that touches walkable space */
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const t=grid[y][x];
      const solidish = SOLID.has(t) || t===1 || t===2 || t===22 || t===3;
      if(!solidish) continue;
      const x0=x*T, x1=x0+T, z0=y*T, z1=z0+T;
      const faces=[
        {d:[0,1], n:"s", ok:faceOpen(x,y+1), pts:[[x0,0,z1],[x1,0,z1],[x1,WALL_H,z1],[x0,WALL_H,z1]], wtex:wallTexFor(x,y,"s"), wface:"s"},
        {d:[0,-1],n:"n", ok:faceOpen(x,y-1), pts:[[x1,0,z0],[x0,0,z0],[x0,WALL_H,z0],[x1,WALL_H,z0]], wtex:wallTexFor(x,y,"n"), wface:"n"},
        {d:[1,0], n:"e", ok:faceOpen(x+1,y), pts:[[x1,0,z1],[x1,0,z0],[x1,WALL_H,z0],[x1,WALL_H,z1]], wtex:wallTexFor(x,y,"e"), wface:"e"},
        {d:[-1,0],n:"w", ok:faceOpen(x-1,y), pts:[[x0,0,z0],[x0,0,z1],[x0,WALL_H,z1],[x0,WALL_H,z0]], wtex:wallTexFor(x,y,"w"), wface:"w"}
      ];
      const hugFix = HUG_BACK[t]!==undefined;
      const furn = FURNITURE.has(t);
      for(const f of faces){
        if(!f.ok) continue;
        /* furniture and wall fixtures are models standing on the floor of their
           own tile: the wall behind them is drawn by the neighbouring wall tile */
        if(furn||hugFix) continue;
        const wx = x+f.d[0], wy = y+f.d[1];
        const win = winAt[wx+","+wy+":"+f.wface] || winAt[x+","+y+":"+f.wface];
        const fc=FACE[f.n];
        if(win && (t===1)){
          /* window: carve the wall into sill / glass / header */
          const pts=f.pts;
          this.addQuad(strip(pts,0,0.9),[1,0.3],wallShade(f.n),"wall_block",x,y,fc);
          this.addQuad(strip(pts,0.9,2.35),[1,0.5],1.34,"window",x,y,fc);
          this.addQuad(strip(pts,2.35,WALL_H),[1,0.22],wallShade(f.n),"wall_block",x,y,fc);
          markSun(wx,wy,f.d[0],f.d[1]);
        } else if(t===1){
          this.addQuad(f.pts,[1,1],wallShade(f.n),f.wtex,x,y,fc);
        } else if(t===4){
          /* lockers: recessed wall + locker bank model */
          this.addQuad(f.pts,[1,1],wallShade(f.n)*0.9,f.wtex,x,y,fc);
        } else if(t===2||t===22){
          /* door frame */
          this.addQuad(strip(f.pts,2.05,WALL_H),[1,0.32],wallShade(f.n),f.wtex,x,y,fc);
          this.addQuad(stripSide(f.pts,0,0.05),[0.03,0.7],wallShade(f.n),"wall_block",x,y,fc);
          this.addQuad(stripSide(f.pts,1.95,2.0),[0.03,0.7],wallShade(f.n),"wall_block",x,y,fc);
        } else if(t===3){
          /* the chained front doors: bright daylight beyond */
          this.addQuad(strip(f.pts,2.5,WALL_H),[1,0.17],wallShade(f.n),"wall_block",x,y,fc);
        }
      }
      /* tile-driven props */
      if(TILE_MODEL[t]){
        const yaw = faceYaw(x,y);
        /* fixtures stand flush against the wall behind them; furniture centres */
        const back = HUG_BACK[t]||0;
        const cx = x0+T/2 - Math.sin(yaw)*back;
        const cz = z0+T/2 - Math.cos(yaw)*back;
        this.props.push({mesh:TILE_MODEL[t], x:cx, y:0, z:cz, yaw, scale:1, tile:t, tx:x, ty:y});
      }
    }

    /* authored props (bell, bucket, mop, exit doors, stairs...) */
    props.forEach(p=>{
      const mesh = Models.get(p.mesh);
      if(!mesh) return;
      /* authored props use tile coordinates (fractions allowed): (23.5,31) is the
         seam between exit tiles, (46.4,2) is the face of the tower door */
      this.props.push({mesh:p.mesh, x:(p.x+0.5)*T, y:0, z:(p.y+0.5)*T, yaw:p.yaw, scale:p.scale||1, tag:p.tag||null, authored:true});
    });

    /* wall decor */
    decor.forEach(d=>this.addDecor(d));
  },

  addDecor(d){
    const x0=d.x*T, z0=d.y*T;
    let pts, w, h, cy, texName;
    switch(d.type){
      case "sign":      w=1.5; h=0.44; cy=2.28; texName="sign:"+d.tag; break;
      case "poster":    w=0.9; h=1.1;  cy=1.75; texName="poster:"+d.tag; break;
      case "mural":     w=2.2; h=1.5;  cy=1.45; texName="mural"; break;
      case "chalkboard":w=2.6; h=1.3;  cy=1.55; texName="chalkboard"; break;
      case "clock":     w=0.46;h=0.46; cy=2.42; texName="clock"; break;
      case "mirror":    w=1.0; h=1.4;  cy=1.5;  texName="mirror"; break;
      case "speaker":   w=0.7; h=0.24; cy=2.6;  texName="speaker"; break;
      default: return;
    }
    const off=0.07;
    const cx=x0+T/2, cz=z0+T/2;
    if(d.face==="s"){        /* faces +Z, mounted on the tile's north edge */
      const z=z0+off;
      pts=[[cx-w/2,cy-h/2,z],[cx+w/2,cy-h/2,z],[cx+w/2,cy+h/2,z],[cx-w/2,cy+h/2,z]];
    } else if(d.face==="n"){
      const z=z0+T-off;
      pts=[[cx+w/2,cy-h/2,z],[cx-w/2,cy-h/2,z],[cx-w/2,cy+h/2,z],[cx+w/2,cy+h/2,z]];
    } else if(d.face==="e"){
      const x=x0+off;
      pts=[[x,cy-h/2,cz+w/2],[x,cy-h/2,cz-w/2],[x,cy+h/2,cz-w/2],[x,cy+h/2,cz+w/2]];
    } else {
      const x=x0+T-off;
      pts=[[x,cy-h/2,cz-w/2],[x,cy-h/2,cz+w/2],[x,cy+h/2,cz+w/2],[x,cy+h/2,cz-w/2]];
    }
    this.addQuad(pts,[1,1],d.type==="clock"?1.05:1.0,texName,d.x,d.y,FACE[d.face]);
  },

  /* per-frame draw with tile bucketing + view cone culling */
  draw(cam){
    const ctx = Math.floor(cam.x/T), cty = Math.floor(cam.z/T);
    const S=this.scratch;
    let drawn=0;
    for(let ty=cty-VIEW_TILES; ty<=cty+VIEW_TILES; ty++){
      for(let tx=ctx-VIEW_TILES; tx<=ctx+VIEW_TILES; tx++){
        if(tx<0||ty<0||tx>=mapW()||ty>=mapH()) continue;
        const dx=(tx+0.5)*T-cam.x, dz=(ty+0.5)*T-cam.z;
        const d2=dx*dx+dz*dz;
        const maxD=(VIEW_TILES*T);
        if(d2>maxD*maxD) continue;
        /* view cone: forward dot (cheap reject of tiles behind the camera) */
        const dd=Math.sqrt(d2)||1;
        /* frustum-ish cull: beyond arm's reach, anything more than ~72 deg off
           axis can never project on screen (the horizontal FOV is ~100 deg) */
        if(dd>6 && (dx*cam.fx+dz*cam.fz)/dd < 0.30) continue;
        const arr=this.buckets.get(tx+","+ty);
        if(arr){
          for(let i=0;i<arr.length;i++){
            const q=this.quads[arr[i]];
            const f=q.f;
            if(f===1){ if(cam.z > q.p[2]+0.02) continue; }        // looks north: only visible from north of it
            else if(f===2){ if(cam.z < q.p[2]-0.02) continue; }   // looks south
            else if(f===3){ if(cam.x < q.p[0]-0.02) continue; }   // looks east
            else if(f===4){ if(cam.x > q.p[0]+0.02) continue; }   // looks west
            for(let k=0;k<4;k++){ S[k][0]=q.p[k*3]; S[k][1]=q.p[k*3+1]; S[k][2]=q.p[k*3+2]; }
            R3.quadWorld(cam,S[0],S[1],S[2],S[3],q.uv,q.sh,q.tex,0);
            drawn++;
          }
        }
      }
    }
    return drawn;
  },

  drawProps(cam, filterFn){
    const list=this.props;
    for(let i=0;i<list.length;i++){
      const p=list[i];
      if(filterFn && filterFn(p)) continue;
      const dx=p.x-cam.x, dz=p.z-cam.z;
      const d2=dx*dx+dz*dz;
      const maxD=VIEW_TILES*T;
      if(d2>maxD*maxD) continue;
      const dd=Math.sqrt(d2)||1;
      if(dd>3 && (dx*cam.fx+dz*cam.fz)/dd < 0.10) continue;
      const mesh = (typeof p.mesh === "string") ? Models.get(p.mesh) : p.mesh;
      if(!mesh) continue;
      R3.drawMesh(mesh, p, 1.0);
    }
  }
};

/* horizontal band of a wall quad; pts are ordered [bl, br, tr, tl] */
function strip(pts,y0,y1){
  const b0=pts[0], b1=pts[1], t1=pts[2], t0=pts[3];
  return [ [b0[0],y0,b0[2]], [b1[0],y0,b1[2]], [t1[0],y1,t1[2]], [t0[0],y1,t0[2]] ];
}
function stripSide(pts,x0f,x1f){
  /* vertical band (door jambs): interpolate along the bottom edge */
  const b0=pts[0], b1=pts[1], t1=pts[2], t0=pts[3];
  const mix=(a,b,k)=>[a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k];
  const p0=mix(b0,b1,x0f), p1=mix(b0,b1,x1f), p2=mix(t0,t1,x1f), p3=mix(t0,t1,x0f);
  return [p0,p1,p2,p3];
}
function isWallOpen(x,y){
  const t=tileAt(x,y);
  return WALKABLE.has(t)||t===2||t===22||t===3;
}
/* Should a wall draw a face toward this neighbour? Open floor, yes — and so is a
   tile holding furniture or a wall fixture, because that is the wall you see
   behind the desk / locker / vending machine. Plain wall tiles do not, or every
   wall would build faces into the middle of itself. */
function faceOpen(x,y){
  const t=tileAt(x,y);
  return WALKABLE.has(t)||t===2||t===22||t===3||(SOLID.has(t)&&t!==1);
}
function wallShade(face){
  /* broad daylight: south-facing walls catch the sun */
  return face==="s"?1.0 : face==="n"?0.88 : face==="e"?0.96 : 0.9;
}
function floorTexFor(x,y,t){
  if(t===15) return "floor_bath";
  if(y>=5&&y<=12){
    if(x>=14&&x<=19) return "floor_bath";
    if(x>=29&&x<=36) return "floor_class";
    return "floor_class";
  }
  if(y>=19&&y<=26){
    if(x>=5&&x<=16) return "floor_cafe";
    if(x>=18&&x<=32) return "floor_gym";
    return "floor_hall";
  }
  return "floor_hall";
}
function wallTexFor(x,y,face){
  if(y>=5&&y<=12&&x>=14&&x<=19) return "wall_bath";
  if(y>=19&&y<=26&&x>=18&&x<=32) return "wall_gym";
  if(y<=3||y>=MH-4||x<=3||x>=MW-4) return "wall_hall";
  if(y>=14&&y<=17) return "wall_hall";
  return "wall_class";
}
function markSun(wx,wy,dx,dy){
  /* sunlight pools on the floor just inside a window */
  for(let k=1;k<=2;k++){
    const x=wx-dx*k, y=wy-dy*k;
    if(x<0||y<0||x>=mapW()||y>=mapH()) continue;
    const t=tileAt(x,y);
    if(!WALKABLE.has(t)) continue;
    const cur=sunTiles[x+","+y]||0;
    const v = k===1?1.22:1.08;
    if(v>cur) sunTiles[x+","+y]=v;
  }
}
function faceYaw(x,y){
  /* which way does a wall-hugging prop face? toward the nearest open tile */
  if(isWallOpen(x,y+1)) return 0;              // +Z
  if(isWallOpen(x,y-1)) return Math.PI;        // -Z
  if(isWallOpen(x+1,y)) return -Math.PI/2;     // +X
  if(isWallOpen(x-1,y)) return Math.PI/2;      // -X
  return 0;
}

/* ============================== settings & save ============================== */
const SAVE_KEY="tbr2_save_v1", SET_KEY="tbr2_settings_v1", WON_KEY="tbr2_won_v1", SECRET_KEY="tbr2_secret_v1";
const RES={ low:{w:256,h:160,label:"Retro 256x160"}, normal:{w:320,h:200,label:"Standard 320x200"}, high:{w:448,h:280,label:"Crisp 448x280"} };
let settings={master:0.8,music:0.55,sfx:0.85,difficulty:"normal",crt:true,shake:true,res:"normal",sens:1.0,dither:true,resSet:false};
try{ const s=JSON.parse(localStorage.getItem(SET_KEY)); if(s) settings=Object.assign(settings,s); }catch(e){}
/* phones get the chunkiest buffer by default: same look, twice the framerate */
if(!settings.resSet && (("ontouchstart" in window)||(navigator.maxTouchPoints||0)>0)) settings.res="low";
function persistSettings(){ try{ localStorage.setItem(SET_KEY,JSON.stringify(settings)); }catch(e){} }
function flag(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function setFlag(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

/* interactable story hotspots (world metres) — one-shot easter eggs */
let hotspots=[];
function buildHotspots(){
  hotspots=[];
  if(curMap==="tower"){
    hotspots.push({type:"bell",x:6.5*T,y:1.5,z:3.9*T,r:3.0,key:"bell",once:false});
    hotspots.push({x:9.5*T,y:1.1,z:5.5*T,r:1.8,lore:"trash",key:"towertrash",once:true});
    hotspots.push({x:2.5*T,y:1.4,z:8.5*T,r:1.8,lore:"plant",key:"towerplant",once:true});
    hotspots.push({x:6.5*T,y:1.6,z:1*T,r:2.4,lore:"stage",key:"towerwindow",once:true});
    return;
  }
  const H=(tx,tz,lore,key,r)=>hotspots.push({x:tx*T,y:1.2,z:tz*T,r:r||1.9,lore,key,once:true});
  H(32.4,6.4,"yearbook","yearbook");          // library table
  H(20,29.5,"lostfound","lostfound");         // south hall
  H(31.5,25.5,"closet","closet");             // janitor's closet
  H(25,20,"gym","gym",2.4);                   // gym scoreboard
  H(8,6,"office","coats");                    // Room 101 coat hooks
  H(40,21,"office","principal",1.6);          // principal's desk
  H(15,10,"mirror","stall",1.6);              // a bathroom stall
  H(41,11,"radio","av",1.8);                  // A/V shelf
}
function persistSave(){
  if(!G||G.state==="title"||G.state==="intro") return;
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify({
    v:2, map:G.map, px:G.player.x, py:G.player.y, yaw:G.player.yaw,
    pages:G.pagesGot, tapes:G.tapesGot, slips:G.slips, soda:G.soda, pass:G.pass, messes:G.messes,
    battery:0, stamina:G.stamina, time:G.time, difficulty:G.difficulty, ngPlus:G.ngPlus,
    periodIdx:G.periodIdx, periodTimer:G.periodTimer, exitUnlocked:G.exitUnlocked,
    towerUnlocked:G.towerUnlocked, bellRung:G.bellRung, knocked:G.knocked,
    vendingUses:G.vendingUses, clockUses:G.clockUses, mirrorSeen:G.mirrorSeen, seen:G.seen,
    secretOpen:G.secretOpen, pattyAppeased:G.pattyAppeased
  })); }catch(e){}
}
function loadSave(){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); return (s&&s.v===2)?s:null; }catch(e){ return null; } }
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

/* ============================== pickups ============================== */
const PAGE_SPOTS=[[8,6],[24,6],[33,10],[40,8],[14,11],[21,16],[29,15],[10,20],[16,24],[26,22],[41,20],[41,24],
                  [3,7],[44,12],[6,29],[31,29],[19,11],[38,16]];
const TAPE_SPOTS=[[29,5],[40,6],[31,26],[40,23],[15,7]];   // nook, A/V, closet, principal, bathroom
const SODA_SPOTS=[[7,20],[13,25],[6,15],[24,16],[40,16],[11,29],[44,9]];
const PASS_SPOTS=[[16,15],[25,3],[36,17],[10,29],[42,5],[20,21]];
function makePickups(){
  const out=[];
  const put=(kind,id,spot,y)=>{
    const w=snapWalk(spot[0],spot[1]);           // never spawn a pickup inside a prop
    out.push({kind,id,x:w[0]*T+T/2,z:w[1]*T+T/2,y,got:false,spin:Math.random()*6});
  };
  PAGE_SPOTS.slice().sort(()=>Math.random()-0.5).slice(0,8).forEach((p,i)=>put("page",i,p,0.95));
  TAPE_SPOTS.forEach((p,i)=>put("tape",i,p,0.7));
  SODA_SPOTS.forEach((p,i)=>put("soda",i,p,0.7));
  PASS_SPOTS.forEach((p,i)=>put("pass",i,p,0.85));
  return out;
}

/* ============================== bell schedule ============================== */
const PERIODS=[
 {name:"PERIOD 1 — READING",     danger:"calm",  mop:[[8,16],[20,16],[32,16],[44,10],[25,3],[10,29]],      patty:[[6,15],[16,16],[26,16],[36,15]]},
 {name:"PERIOD 2 — ARITHMETIC",  danger:"calm",  mop:[[24,16],[40,16],[44,20],[31,29],[12,29],[2,20]],     patty:[[10,2],[20,2],[30,3],[42,2]]},
 {name:"RECESS",                 danger:"tense", mop:[[10,16],[24,16],[38,16],[24,29],[10,3],[45,3]],       patty:[[8,16],[18,15],[28,17],[38,16],[24,29]]},
 {name:"PERIOD 3 — ART",         danger:"calm",  mop:[[32,3],[19,3],[9,3],[2,12],[2,24],[16,29]],          patty:[[44,8],[44,16],[44,24],[31,29]]},
 {name:"ASSEMBLY",               danger:"safe",  mop:[[25,22],[22,24],[28,24]],                            patty:[[24,20],[26,22],[22,24]]},
 {name:"PERIOD 4 — MUSIC",       danger:"tense", mop:[[16,16],[30,16],[44,16],[24,10],[24,22],[8,8]],      patty:[[14,16],[24,16],[34,16],[24,26]]},
 {name:"PERIOD 5 — PHYS. ED.",   danger:"tense", mop:[[20,22],[28,22],[24,26],[44,26],[30,16]],            patty:[[18,20],[26,20],[29,24],[20,25]]},
 {name:"STUDY HALL",             danger:"calm",  mop:[[5,16],[12,16],[20,16],[28,16],[36,16],[44,16]],     patty:[[6,29],[18,29],[31,29],[42,29]]}
];
const FINAL_PERIOD={name:"FINAL PERIOD", danger:"finale", mop:null, patty:null};

/* ============================== game state ============================== */
let G=null;
function newGameState(diff,ngPlus){
  buildMap("school");
  Level.build();
  buildHotspots();
  const d=DIFF[diff]||DIFF.normal;
  const g={
    state:"intro", map:"school", time:0, difficulty:diff, ngPlus:!!ngPlus,
    pagesGot:[], tapesGot:[], slips:0, soda:1, pass:1, messes:5+d.messBonus, stamina:100,
    hidden:false, hiddenLocker:null, exitUnlocked:false, towerUnlocked:false, bellRung:false,
    player:{x:24*T+T/2, y:29*T+T/2, yaw:Math.PI, pitch:0, vx:0, vz:0, walk:0, bob:0, moving:false, running:false, speedBoost:0, look:{x:0,y:0}},
    mop:{x:40*T, y:16*T, yaw:0, walk:0, state:"patrol", path:[], pathTimer:0, lastKnown:null,
         investigate:null, investigateTimer:0, stun:0, searchTimer:0, patrolIdx:0, losTimer:0,
         cleanTarget:null, cleanTimer:0, line:0, sawHide:false},
    patty:{x:12*T, y:16*T, yaw:0, walk:0, state:"patrol", patrolIdx:0, target:null, losTimer:0,
           telegraph:0, cooldown:0, slipAnim:0, whistleTimer:0, investigateTimer:0},
    pickups:makePickups(), particles:[], messesList:[], knocked:{},
    periodIdx:0, periodTimer:d.period, periodCount:0, paused:false,
    secretOpen:false, pattyAppeased:0, thrownPass:null, noiseTimer:0, mopStairs:false,
    schoolReturn:null, lookTarget:null, mood:"calm", hiddenFrom:null,
    vendingUses:0, clockUses:0, mirrorSeen:false, seen:{}, loreQueue:null,
    glitch:0, shake:0, fade:1, fadeDir:-1, scareT:0, caught:false, won:false, ending:null,
    flash:0, bellT:0, lookTarget:null, dangerLevel:0, heartTimer:0, paTimer:14,
    patrolMop:PERIODS[0].mop, patrolPatty:PERIODS[0].patty
  };
  return g;
}
function applySave(sv){
  G=newGameState(sv.difficulty||"normal", sv.ngPlus);
  if(sv.map==="tower") enterTower(true);
  G.pagesGot=sv.pages||[]; G.tapesGot=sv.tapes||[]; G.slips=sv.slips||0;
  G.soda=sv.soda===undefined?1:sv.soda; G.pass=sv.pass===undefined?1:sv.pass;
  G.messes=sv.messes===undefined?5:sv.messes; G.stamina=sv.stamina||100;
  G.time=sv.time||0; G.player.x=sv.px; G.player.y=sv.py; G.player.yaw=sv.yaw||Math.PI;
  G.periodIdx=sv.periodIdx||0; G.periodTimer=sv.periodTimer||DIFF[G.difficulty].period;
  G.exitUnlocked=!!sv.exitUnlocked; G.towerUnlocked=!!sv.towerUnlocked; G.bellRung=!!sv.bellRung;
  G.knocked=sv.knocked||{}; G.vendingUses=sv.vendingUses||0; G.clockUses=sv.clockUses||0;
  G.mirrorSeen=!!sv.mirrorSeen; G.seen=sv.seen||{};
  G.secretOpen=!!sv.secretOpen; G.pattyAppeased=sv.pattyAppeased||0;
  if(G.secretOpen&&G.map==="school"){ applySecretOpen(); Level.build(); }
  G.pickups.forEach(p=>{
    if(p.kind==="page"&&G.pagesGot.includes(p.id)) p.got=true;
    if(p.kind==="tape"&&G.tapesGot.includes(p.id)) p.got=true;
  });
  G.patrolMop=(PERIODS[G.periodIdx]||PERIODS[0]).mop;
  G.patrolPatty=(PERIODS[G.periodIdx]||PERIODS[0]).patty;
  if(G.bellRung){ G.mop.state="chase"; G.mop.lastKnown={x:G.player.x,y:G.player.y}; }
  G.state="playing"; G.fade=1; G.fadeDir=-1;
}

/* ============================== input ============================== */
const keys={};
let touchMove={x:0,y:0}, touchRun=false, touchLook={active:false,id:null,x:0,y:0};
let pointerLocked=false;

window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  if(["arrowup","arrowdown","arrowleft","arrowright"," ","tab"].includes(k)) e.preventDefault();
  if(!G) return;
  if(k==="e"||k==="enter"||k===" "){ if(G.state==="reading") closeReader(); else if(G.state==="playing") doInteract(); }
  if(k==="f"&&G.state==="playing") makeMess();
  if(k==="q"&&G.state==="playing") useSoda();
  if(k==="r"&&G.state==="playing") throwPass();
  if(k==="t"&&G.state==="playing") showPass();
  if(k==="escape"||k==="p"){
    if(G.state==="playing") pauseGame();
    else if(G.state==="paused") resumeGame();
  }
  if(k==="m"){ settings.master=settings.master>0?0:0.8; Sound.setVolumes(settings.master,settings.music,settings.sfx); syncSettingsUI(); toast(settings.master>0?"Sound on":"Sound muted"); }
});
window.addEventListener("keyup",e=>{ keys[e.key.toLowerCase()]=false; });

/* mouse look with pointer lock */
function initMouse(){
  const cv=$("game");
  cv.addEventListener("click",()=>{
    if(G&&G.state==="playing"&&!pointerLocked&&cv.requestPointerLock&&!isTouchDevice()) { try{ cv.requestPointerLock(); }catch(e){} }
  });
  document.addEventListener("pointerlockchange",()=>{
    pointerLocked = (document.pointerLockElement===cv);
    if(!pointerLocked && G && G.state==="playing") pauseGame();
  });
  window.addEventListener("mousemove",e=>{
    if(!G||G.state!=="playing") return;
    if(pointerLocked){
      G.player.yaw   += (e.movementX||0)*0.0026*settings.sens;
      G.player.pitch -= (e.movementY||0)*0.0022*settings.sens;
      G.player.pitch = clamp(G.player.pitch,-0.62,0.62);
    } else if(e.buttons===1){
      G.player.yaw   += (e.movementX||0)*0.004*settings.sens;
      G.player.pitch -= (e.movementY||0)*0.0034*settings.sens;
      G.player.pitch = clamp(G.player.pitch,-0.62,0.62);
    }
  });
}
function isTouchDevice(){
  return ("ontouchstart" in window) || (navigator.maxTouchPoints||0) > 0;
}

/* touch: left half = move stick, right half = look */
function initTouch(){
  const tc=$("touch-controls"), stick=$("stick"), knob=$("stick-knob");
  if(isTouchDevice()){ tc.classList.remove("hidden"); document.body.classList.add("touch"); }
  let stickId=null;
  function stickPos(e){
    const r=stick.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    let dx=e.clientX-cx, dy=e.clientY-cy;
    const m=Math.hypot(dx,dy), max=Math.max(10,r.width/2-10);
    if(m>max){ dx=dx/m*max; dy=dy/m*max; }
    knob.style.transform="translate("+dx+"px,"+dy+"px)";
    touchMove.x=dx/max; touchMove.y=dy/max;
  }
  const endStick=e=>{ for(const t of e.changedTouches) if(t.identifier===stickId){ stickId=null; touchMove.x=0; touchMove.y=0; knob.style.transform=""; } };
  stick.addEventListener("touchstart",e=>{ stickId=e.changedTouches[0].identifier; stickPos(e.changedTouches[0]); e.preventDefault(); },{passive:false});
  stick.addEventListener("touchmove",e=>{ for(const t of e.changedTouches) if(t.identifier===stickId) stickPos(t); e.preventDefault(); },{passive:false});
  stick.addEventListener("touchend",endStick); stick.addEventListener("touchcancel",endStick);

  const cv=$("game");
  cv.addEventListener("touchstart",e=>{
    for(const t of e.changedTouches){
      if(t.clientX > window.innerWidth*0.34 && !touchLook.active){
        touchLook.active=true; touchLook.id=t.identifier; touchLook.x=t.clientX; touchLook.y=t.clientY;
      }
    }
  },{passive:true});
  cv.addEventListener("touchmove",e=>{
    for(const t of e.changedTouches){
      if(touchLook.active && t.identifier===touchLook.id && G && G.state==="playing"){
        const dx=t.clientX-touchLook.x, dy=t.clientY-touchLook.y;
        touchLook.x=t.clientX; touchLook.y=t.clientY;
        G.player.yaw   += dx*0.0062*settings.sens;
        G.player.pitch -= dy*0.0052*settings.sens;
        G.player.pitch = clamp(G.player.pitch,-0.62,0.62);
      }
    }
    e.preventDefault();
  },{passive:false});
  const endLook=e=>{ for(const t of e.changedTouches) if(touchLook.active&&t.identifier===touchLook.id) touchLook.active=false; };
  cv.addEventListener("touchend",endLook); cv.addEventListener("touchcancel",endLook);

  const bind=(id,down,up)=>{ const el=$(id); if(!el) return;
    el.addEventListener("touchstart",e=>{ down(); e.preventDefault(); },{passive:false});
    if(up) el.addEventListener("touchend",e=>{ up(); e.preventDefault(); },{passive:false});
    el.addEventListener("click",e=>{ down(); e.preventDefault(); });
  };
  bind("tb-interact",()=>{ if(!G) return; if(G.state==="reading") closeReader(); else if(G.state==="playing") doInteract(); });
  bind("tb-run",()=>{ touchRun=!touchRun; $("tb-run").classList.toggle("on",touchRun); });
  bind("tb-mess",()=>{ if(G&&G.state==="playing") makeMess(); });
  bind("tb-item",()=>{ if(G&&G.state==="playing") useSoda(); });
  bind("tb-pass",()=>{ if(G&&G.state==="playing") throwPass(); });
  bind("tb-show",()=>{ if(G&&G.state==="playing") showPass(); });
}

/* ============================== player ============================== */
function collides(px,pz,r){
  const pts=[[px-r,pz-r],[px+r,pz-r],[px-r,pz+r],[px+r,pz+r]];
  for(const [x,z] of pts){
    const tx=Math.floor(x/T), ty=Math.floor(z/T), t=tileAt(tx,ty);
    if(isSolidTile(t)||t===1||t===3) return true;
    if(t===2||t===22){ const d=doors[tx+","+ty]; if(d&&!d.open) return true; }
  }
  return false;
}
function updatePlayer(dt){
  const p=G.player, d=DIFF[G.difficulty];
  if(G.hidden){ p.vx=0; p.vz=0; p.moving=false; return; }
  /* look: keys turn as well as mouse/touch */
  const turn=2.35*dt;
  if(keys["arrowleft"]) p.yaw-=turn;
  if(keys["arrowright"]) p.yaw+=turn;
  if(keys["arrowup"]) p.pitch=clamp(p.pitch+1.3*dt,-0.62,0.62);
  if(keys["arrowdown"]) p.pitch=clamp(p.pitch-1.3*dt,-0.62,0.62);

  let mx=0,mz=0;
  if(keys["w"]) mz+=1;
  if(keys["s"]) mz-=1;
  if(keys["a"]) mx-=1;
  if(keys["d"]) mx+=1;
  mx+=touchMove.x; mz-=touchMove.y;
  const mag=Math.hypot(mx,mz);
  p.moving = mag>0.18;
  if(p.moving){ mx/=Math.max(1,mag); mz/=Math.max(1,mag); }
  p.running = (keys["shift"]||touchRun) && p.moving && G.stamina>2;
  let speed = p.running?RUN_SPEED:WALK_SPEED;
  if(p.speedBoost>0){ speed*=1.18; p.speedBoost-=dt; }
  if(G.hidden) speed=0;
  /* smooth acceleration for game feel */
  const wantX = p.moving ? (mx*Math.cos(p.yaw)+mz*Math.sin(p.yaw))*speed : 0;
  const wantZ = p.moving ? (-mx*Math.sin(p.yaw)+mz*Math.cos(p.yaw))*speed : 0;
  p.vx += (wantX-p.vx)*Math.min(1,ACCEL*dt);
  p.vz += (wantZ-p.vz)*Math.min(1,ACCEL*dt);

  if(p.running){
    G.stamina=clamp(G.stamina-21*d.stam*dt,0,100);
    G.noiseTimer=(G.noiseTimer||0)-dt;
    if(G.noiseTimer<=0){ G.noiseTimer=0.36; emitNoise(p.x,p.y,11); Sound.footstep(true); }
  } else {
    G.stamina=clamp(G.stamina+14*dt,0,100);
    if(p.moving){
      G.noiseTimer=(G.noiseTimer||0)-dt;
      if(G.noiseTimer<=0){ G.noiseTimer=0.5; emitNoise(p.x,p.y,3.2); Sound.footstep(false); }
    }
  }
  const r=0.34;
  const nx=p.x+p.vx*dt, nz=p.y+p.vz*dt;
  if(!collides(nx,p.y,r)) p.x=nx; else p.vx*=0.2;
  if(!collides(p.x,nz,r)) p.y=nz; else p.vz*=0.2;

  const spd=Math.hypot(p.vx,p.vz);
  p.walk += spd*dt*2.2;
  p.bob = Math.sin(p.walk*2.0)*Math.min(1,spd/WALK_SPEED);

  /* pickups: walk into them */
  for(const pk of G.pickups){
    if(pk.got) continue;
    if(dist(p.x,p.y,pk.x,pk.z) < 1.05) collectPickup(pk);
  }
  /* hotspots are looked at, not walked over — handled in lookTarget */
}

/* ============================== noise & particles ============================== */
function emitNoise(x,z,radius){
  if(!G) return;
  const j=G.mop;
  if(dist(x,z,j.x,j.y)<=radius){
    if(j.state==="cleaning") return;
    if(j.state==="patrol"||j.state==="search"){ j.state="investigate"; j.investigate={x,z}; j.investigateTimer=5; }
    else if(j.state==="investigate"){ j.investigate={x,z}; j.investigateTimer=5; }
  }
  /* Patty hears noise too, but she only investigates, she never chases */
  const pa=G.patty;
  if(dist(x,z,pa.x,pa.y)<=radius*0.7 && pa.state==="patrol"){ pa.state="investigate"; pa.target={x,z}; pa.investigateTimer=4; }
}
function spawnParticles(x,y,z,color,n,spread){
  if(!G) return;
  for(let i=0;i<n;i++) G.particles.push({x,y,z,vx:rand(-spread,spread),vy:rand(0,spread*0.8),vz:rand(-spread,spread),life:rand(0.4,1.1),color,size:rand(0.02,0.06)});
  if(G.particles.length>260) G.particles.splice(0,G.particles.length-260);
}

/* ============================== what am I looking at? ============================== */
const TILE_LORE={10:"vending",14:"trash",9:"plant",23:"trophy",24:"fountain",8:"bookcase",11:"toilet",12:"sink"};
const DECOR_LORE={clock:"clock",mirror:"mirror",chalkboard:"blackboard",mural:"mural",speaker:"radio"};
function decorAtTile(tx,ty,face){
  for(const d of decor) if(d.x===tx&&d.y===ty&&d.face===face) return d;
  return null;
}
function lookTarget(){
  const p=G.player;
  if(G.hidden) return {type:"unhide",label:"Leave the locker"};
  const fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
  /* hotspots first (they float in space, not on the tile grid) */
  let bestHot=null, bestHotD=1e9;
  for(const h of hotspots){
    if(h.once && G.seen[h.key]) continue;
    const dx=h.x-p.x, dz=h.z-p.y;
    const dd=Math.hypot(dx,dz);
    if(dd>h.r+0.6) continue;
    const dot=(dx*fx+dz*fz)/(dd||1);
    if(dot<0.35) continue;
    if(dd<bestHotD){ bestHotD=dd; bestHot=h; }
  }
  const step=0.16;
  let prevTx=Math.floor(p.x/T), prevTy=Math.floor(p.y/T);
  for(let s=step;s<=REACH;s+=step){
    const x=p.x+fx*s, z=p.y+fz*s;
    const tx=Math.floor(x/T), ty=Math.floor(z/T);
    if(tx===prevTx&&ty===prevTy) continue;
    const t=tileAt(tx,ty);
    const ddx=tx*T+T/2-p.x, ddz=ty*T+T/2-p.y;
    const dd=Math.hypot(ddx,ddz);
    /* a hotspot closer than the wall wins */
    if(bestHot && bestHotD < dd) return hotTarget(bestHot);
    const face = (Math.abs(fx)>Math.abs(fz)) ? (fx>0?"w":"e") : (fz>0?"n":"s");
    if(t===2){
      const d=doors[tx+","+ty];
      if(d&&d.tower) return {type:"towerDown",tx,ty,label:"Go back down the stairs"};
      return {type:"door",tx,ty,door:d,label:(d&&d.open)?"Close the door":"Open the door"};
    }
    if(t===22) return {type:"tower",tx,ty,label:G.towerUnlocked?"Climb to the bell tower":"Locked — the stairs door is chained"};
    if(t===3) return {type:"exit",tx,ty,label:G.exitUnlocked?"ESCAPE THROUGH THE FRONT DOORS":"The front doors are chained"};
    if(t===4) return {type:"locker",tx,ty,label:"Hide in the locker"};
    if(t===25) return {type:"secret",tx,ty,label:"This bookcase is not quite flush with the wall"};
    if(TILE_LORE[t]) return {type:"lore",key:TILE_LORE[t],tx,ty,label:"Examine"};
    if(t===1){
      const dc=decorAtTile(tx,ty,face);
      if(dc){
        if(dc.type==="sign") return {type:"read",text:dc.tag,label:"Read the sign"};
        if(DECOR_LORE[dc.type]) return {type:"lore",key:(dc.type==="poster"?posterKey(dc.tag):DECOR_LORE[dc.type]),tx,ty,label:"Examine",decor:dc};
        if(dc.type==="poster") return {type:"lore",key:posterKey(dc.tag),tx,ty,label:"Read the poster",decor:dc};
      }
      return null;
    }
    prevTx=tx; prevTy=ty;
  }
  if(bestHot) return hotTarget(bestHot);
  return null;
}
function hotTarget(h){
  if(h.type==="bell") return {type:"bell",label:G.bellRung?"The bell is still ringing":"RING THE BELL",hotspot:h};
  if(h.once&&G.seen[h.key]) return null;
  return {type:"hotspot",label:"Examine",hotspot:h};
}
function posterKey(tag){
  return {"4:47":"poster447","BELL SCHEDULE":"posterBell","READ!":"posterRead","SAFETY FIRST":"posterSafety","GO GATORS":"posterGators","ATTENDANCE":"posterAttendance"}[tag]||"posterSafety";
}

/* ============================== interaction ============================== */
function doInteract(){
  if(!G||G.state!=="playing") return;
  const tg=lookTarget();                 // always fresh: the cached value is for the HUD
  G.lookTarget=tg;
  if(!tg) return;
  if(tg.type==="door"){ openDoor(tg.door); return; }
  if(tg.type==="towerDown"){ leaveTower(); return; }
  if(tg.type==="locker"){ enterLocker(tg.tx,tg.ty); return; }
  if(tg.type==="unhide"){ exitLocker(); return; }
  if(tg.type==="secret"){ openSecret(); return; }
  if(tg.type==="exit"){ tryExit(); return; }
  if(tg.type==="tower"){ tryTower(); return; }
  if(tg.type==="bell"){ ringBell(); return; }
  if(tg.type==="read"){ Sound.click(); openReader("A SIGN", tg.text); return; }
  if(tg.type==="hotspot"){
    const h=tg.hotspot;
    if(h.once) G.seen[h.key]=true;
    Sound.whisper();
    openReader(LORE_TITLE[h.lore]||"SOMETHING", LORE[h.lore]||"...");
    if(h.lore==="closet"){ G.glitch=Math.max(G.glitch,0.8); }
    persistSave();
    return;
  }
  if(tg.type==="lore"){ interactLore(tg.key,tg); return; }
}
const LORE_TITLE={
 vending:"VENDING MACHINE",clock:"THE CLOCK",mirror:"THE MIRROR",radio:"THE INTERCOM",
 blackboard:"THE BLACKBOARD",trash:"A TRASH CAN",plant:"A PLANT",office:"THE OFFICE",
 trophy:"THE TROPHY CASE",fountain:"WATER FOUNTAIN",bookcase:"THE SHELVES",
 yearbook:"THE YEARBOOK",lostfound:"LOST AND FOUND",closet:"THE JANITOR'S CLOSET",
 gym:"THE SCOREBOARD",mural:"A MURAL",poster447:"A POSTER",posterBell:"THE BELL SCHEDULE",
 posterRead:"A READING POSTER",posterSafety:"A SAFETY POSTER",posterGators:"A BANNER",
 posterAttendance:"ATTENDANCE",toilet:"A STALL",sink:"A SINK",nook:"A HIDING PLACE"
};
function interactLore(key,tg){
  const p=G.player;
  if(key==="vending"){
    if(G.vendingUses<3){ G.vendingUses++; G.soda++; Sound.soda(); toast(LORE["vending"+G.vendingUses]); }
    else { Sound.error(); toast(LORE.vending3); }
  } else if(key==="clock"){
    G.clockUses++; Sound.clockTick();
    toast(LORE["clock"+Math.min(4,G.clockUses)],4200);
    if(G.clockUses===4){ Sound.whisper(); G.glitch=1.2; G.shake=Math.max(G.shake,0.3); }
  } else if(key==="mirror"){
    if(!G.mirrorSeen){ G.mirrorSeen=true; Sound.whisper(); G.glitch=1.4; openReader(LORE_TITLE.mirror, LORE.mirror); }
    else toast("You avoid looking at the mirror.");
  } else if(key==="trash"){
    const kk=tg.tx+","+tg.ty;
    if(!G.knocked[kk]){ G.knocked[kk]=true; G.messes++; Sound.pickup(); toast(LORE.trash+"  🗑 Mess +1 ("+G.messes+")"); }
    else { Sound.click(); toast("Already picked clean."); }
  } else if(LORE[key]){
    Sound.click();
    openReader(LORE_TITLE[key]||"...", LORE[key]);
  } else { Sound.click(); }
  emitNoise(p.x,p.y,3.0);
  persistSave();
}
function openDoor(d){
  if(!d) return;
  d.open=!d.open; Sound.door(d.open); emitNoise(d.x*T+T/2,d.y*T+T/2,6.5);
  if(d.tower&&d.open) leaveTower();
}
function enterLocker(tx,ty){
  const p=G.player, j=G.mop;
  G.hidden=true; G.hiddenLocker={x:tx,y:ty};
  G.hiddenFrom={x:p.x,y:p.y};
  p.x=tx*T+T/2; p.y=ty*T+T/2;
  p.yaw = faceYaw(tx,ty);
  Sound.locker(); emitNoise(p.x,p.y,5.5);
  const sees=!losBlocked(j.x,j.y,p.x,p.y)&&dist(j.x,j.y,p.x,p.y)<(j.state==="chase"?9:6);
  j.sawHide=sees&&j.state==="chase";
  toast("You squeeze in. Slats of daylight. Hold still.  [E] to get out.",4200);
  Sound.setMood("safe");
  persistSave();
}
function exitLocker(){
  if(!G.hidden) return;
  G.hidden=false;
  Sound.locker();
  const lk=G.hiddenLocker;
  G.hiddenLocker=null;
  G.mop.sawHide=false;
  /* step out into the first walkable neighbour */
  const p=G.player;
  const outs=[[0,1],[0,-1],[1,0],[-1,0]];
  for(const [dx,dy] of outs){
    const tx=(lk?lk.x:Math.floor(p.x/T))+dx, ty=(lk?lk.y:Math.floor(p.y/T))+dy;
    if(isWalkable(tx,ty)){ p.x=tx*T+T/2; p.y=ty*T+T/2; break; }
  }
  if(G.hiddenFrom && dist(p.x,p.y,G.hiddenFrom.x,G.hiddenFrom.y)<0.2){ p.x=G.hiddenFrom.x; p.y=G.hiddenFrom.y; }
  G.hiddenFrom=null;
  updateMood();
  persistSave();
}
function openSecret(){
  const p=G.player;
  /* find the secret bookcase tile in reach and swing it open */
  let done=false;
  for(let dy=-1;dy<=1&&!done;dy++) for(let dx=-1;dx<=1;dx++){
    const tx=Math.floor(p.x/T)+dx, ty=Math.floor(p.y/T)+dy;
    if(tileAt(tx,ty)===25){
      grid[ty][tx]=0;                    // the shelf swings open: floor from now on
      G.secretOpen=true;
      Level.built=false; Level.build();
      Sound.bookcase(); Sound.whisper();
      G.glitch=1.2; G.shake=Math.max(G.shake,0.35);
      openReader(LORE_TITLE.nook, LORE.nook);
      done=true; break;
    }
  }
  if(!done){ Sound.error(); toast("Nothing to move here."); }
  emitNoise(p.x,p.y,7);
  persistSave();
}

/* ============================== items ============================== */
function useSoda(){
  if(G.soda<=0){ Sound.error(); toast("No soda. The cafeteria machines still work. Somehow."); return; }
  G.soda--; G.stamina=clamp(G.stamina+58,0,100); G.player.speedBoost=3.2;
  Sound.soda(); toast("🥤 Glug glug. Legs feel new.");
  spawnParticles(G.player.x,1.1,G.player.y,"#c8402f",8,1.2);
}
function throwPass(){
  if(G.pass<=0){ Sound.error(); toast("No hall passes. Try the office, or the halls."); return; }
  G.pass--;
  const p=G.player, fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
  G.thrownPass={x:p.x+fx*5.0,y:p.y+fz*5.0,t:0};
  Sound.throwPass(); emitNoise(p.x+fx*5.0,p.y+fz*5.0,13);
  toast("🎫 A hall pass skitters down the hall. He should hear it.");
  spawnParticles(p.x+fx*5.0,0.4,p.y+fz*5.0,"#e8d68c",6,0.8);
}
function makeMess(){
  if(G.messes<=0){ Sound.error(); toast("🗑 Nothing left to spill. Search the trash cans. [E]"); return; }
  G.messes--;
  const p=G.player, fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
  const mx=p.x+fx*1.3, mz=p.y+fz*1.3;
  G.messesList.push({x:mx,z:mz,t:0,seed:rand(0,6.283)});
  Sound.spill(); emitNoise(mx,mz,9);
  toast(choice(MOP_CLEAN),6000);
  spawnParticles(mx,0.25,mz,"#a08a5c",16,1.6);
  /* Mr. Mop is compelled. It is his job. */
  const j=G.mop;
  if(dist(j.x,j.y,mx,mz)<26){
    j.state="cleaning"; j.cleanTarget={x:mx,z:mz}; j.cleanTimer=rand(7,9.5);
    j.lastKnown=null; j.path=[];
    toast("🧹 Mr. Mop is on his way to clean it.",3600);
  }
  G.shake=Math.max(G.shake,0.18);
}
function showPass(){
  const pa=G.patty;
  if(pa.telegraph<=0){
    if(G.pass>0) toast("🎫 You hold up your hall pass. Nobody is checking right now.");
    else Sound.error();
    return;
  }
  if(G.pass<=0){ Sound.error(); toast("No pass to show! She is already writing."); return; }
  G.pass--;
  pa.telegraph=0; pa.cooldown=9; pa.state="patrol";
  Sound.pickup(); toast(choice(PATTY_OK),4200);
  G.pattyAppeased=(G.pattyAppeased||0)+1;
  if(G.pattyAppeased===3){ openReader("PATTY", "\"You know the rules better than I do,\" she says, and for a second she looks tired.\n\n\"Nobody's come to school in a long time. But the day isn't over, so I have to do my job. Do you know what happens if I stop?\"\n\nShe does not wait for an answer."); G.seen.patty3=true; }
}

/* ============================== pickups ============================== */
function collectPickup(pk){
  pk.got=true;
  const p=G.player;
  spawnParticles(pk.x,pk.y,pk.z,"#f2c14e",12,1.1);
  if(pk.kind==="page"){
    G.pagesGot.push(pk.id); Sound.page();
    openReader(PAGES[pk.id].head, PAGES[pk.id].body);
    onPageCollected();
  } else if(pk.kind==="tape"){
    G.tapesGot.push(pk.id); Sound.tape();
    openReader(TAPES[pk.id].head, TAPES[pk.id].body);
    toast("📼 Tape "+G.tapesGot.length+"/5 found.",3600);
    if(G.tapesGot.length===5){ G.glitch=1.6; Sound.whisper(); toast("📼 All five tapes. You remember everything now.",6000); }
  } else if(pk.kind==="soda"){ G.soda++; Sound.soda(); toast("🥤 Soda +1  [Q] to drink"); }
  else if(pk.kind==="pass"){ G.pass++; Sound.pickup(); toast("🎫 Hall pass +1  [R] throw · [T] show it to Patty"); }
  emitNoise(p.x,p.y,3.4);
  persistSave();
}
function onPageCollected(){
  const n=G.pagesGot.length;
  if(n===2){ Sound.whisper(); G.glitch=Math.max(G.glitch,0.5); }
  if(n===3){ G.glitch=1.1; Sound.staticBurst(); toast("The lights in the hallway go out. It is broad daylight. The lights go out anyway.",5200); }
  if(n===5){ Sound.bellSmall(); G.glitch=1.5; mopTeleportScare(); }
  if(n===6){ Sound.whisper(); toast("Somebody is humming in the east hall. It is not coming from the east hall.",5200); }
  if(n===8&&!G.towerUnlocked){
    G.towerUnlocked=true;
    Sound.chime(); Sound.unlock();
    G.glitch=1.8; G.shake=Math.max(G.shake,0.4);
    toast("🔔 The east stairwell unlocks with a sound like a chain letting go. RING THE BELL.",7000);
    G.periodIdx=-1; G.patrolMop=[[44,6],[44,14],[40,16],[44,22],[36,3]]; G.patrolPatty=[[30,16],[38,16],[44,16]];
    updateObjective(); updateMood();
  }
  updateObjective();
}
function mopTeleportScare(){
  const j=G.mop, p=G.player;
  const pts=G.patrolMop||PERIODS[0].mop;
  let best=null,bestD=1e9;
  pts.forEach(pt=>{
    const d=dist(pt[0]*T,pt[1]*T,p.x,p.y);
    if(d>14&&d<bestD){ bestD=d; best=pt; }
  });
  if(best){
    j.x=best[0]*T+T/2; j.y=best[1]*T+T/2; j.state="chase"; j.lastKnown={x:p.x,y:p.y}; j.path=[];
    Sound.sting(); G.shake=Math.max(G.shake,0.5); G.glitch=Math.max(G.glitch,1.0);
    toast(choice(MOP_SEE),3200);
  }
}

/* ============================== MR. MOP ============================== */
function inFront(e,tx,tz,coneRad){
  const dx=tx-e.x, dz=tz-e.y, dd=Math.hypot(dx,dz)||1;
  const dot=(dx*Math.sin(e.yaw)+dz*Math.cos(e.yaw))/dd;
  return dot > Math.cos(coneRad===undefined?1.0:coneRad);
}
function moveAlongPath(ent,target,speed,dt){
  ent.pathTimer-=dt;
  const ttx=Math.floor(target.x/T), tty=Math.floor(target.z!==undefined?target.z/T:target.y/T);
  const etx=Math.floor(ent.x/T), ety=Math.floor(ent.y/T);
  if(ent.pathTimer<=0||!ent.path||!ent.path.length){
    ent.path=findPath(etx,ety,ttx,tty)||[];
    ent.pathTimer=0.55;
  }
  let mx=target.x, mz=(target.z!==undefined?target.z:target.y);
  if(ent.path&&ent.path.length){
    const nx=ent.path[0][0]*T+T/2, nz=ent.path[0][1]*T+T/2;
    mx=nx; mz=nz;
    if(dist(ent.x,ent.y,nx,nz)<0.5) ent.path.shift();
  }
  const ang=Math.atan2(mx-ent.x,mz-ent.y);
  const step=speed*dt;
  const dToT=Math.hypot(mx-ent.x,mz-ent.y);
  /* smooth turning so nobody spins like a top — but snap when the target is
     within a couple of steps, otherwise a chaser orbits forever and never lands */
  let dyaw=((ang-ent.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  if(dToT < Math.max(0.85, step*3)) ent.yaw = ang;
  else ent.yaw += clamp(dyaw,-6*dt,6*dt);
  const nx2=ent.x+Math.sin(ent.yaw)*step, nz2=ent.y+Math.cos(ent.yaw)*step;
  const r=0.36;
  if(!collides(nx2,ent.y,r)) ent.x=nx2;
  if(!collides(ent.x,nz2,r)) ent.y=nz2;
  ent.walk+=speed*dt*1.5;
  /* open a closed door ahead */
  const ax=Math.floor((ent.x+Math.sin(ent.yaw)*1.1)/T), ay=Math.floor((ent.y+Math.cos(ent.yaw)*1.1)/T);
  const at2=tileAt(ax,ay);
  if(at2===2||at2===22){ const d=doors[ax+","+ay]; if(d&&!d.open&&!(d.tower)){ d.open=true; Sound.door(true); } }
}
function updateMop(dt){
  const j=G.mop, p=G.player, d=DIFF[G.difficulty];
  if(j.stun>0){ j.stun-=dt; j.walk+=dt*0.4; return; }
  const ng=G.ngPlus?1.14:1;
  const rage=G.bellRung?1.06:1;
  const chaseSpeed=(d.chase+G.pagesGot.length*0.115)*rage*ng;
  const patrolSpeed=d.patrol*(G.bellRung?1.25:1)*ng;
  const dToP=dist(j.x,j.y,p.x,p.y);

  /* senses: daylight gives him long sightlines */
  j.losTimer-=dt;
  if(!G.hidden&&j.state!=="cleaning"&&j.losTimer<=0){
    j.losTimer=0.13;
    const view=17.5;
    const cone = (j.state==="chase") ? 2.4 : 1.05;
    if(dToP<view && !losBlocked(j.x,j.y,p.x,p.y) && inFront(j,p.x,p.y,cone)){
      if(j.state!=="chase"){
        j.state="chase"; j.path=[]; Sound.sting(); G.shake=Math.max(G.shake,0.45);
        toast(choice(MOP_SEE),3000);
        updateMood();
      }
      j.lastKnown={x:p.x,y:p.y}; j.searchTimer=0;
    }
  }
  /* he can only grab you when he is not busy; a mopping janitor is bent over
     his work, so the catch radius shrinks while he cleans */
  const grab = j.state==="cleaning" ? 0.62 : 1.15;
  if(!G.hidden&&dToP<grab){ caught(); return; }
  if(G.hidden&&j.sawHide&&dToP<1.35){ caught(); return; }

  let target=null, speed=patrolSpeed;
  if(j.state==="cleaning"){
    /* the compulsion: a mess must be cleaned */
    target=j.cleanTarget; speed=patrolSpeed*1.25;
    if(target&&dist(j.x,j.y,target.x,target.z)<0.9){
      j.cleanTimer-=dt;
      j.walk+=dt*3.2;
      if(Math.random()<dt*0.5) Sound.footstepFar();
      if(Math.random()<dt*0.22) toast(choice(MOP_CLEANING),2600);
      if(j.cleanTimer<=0){
        /* the mess is gone */
        G.messesList=G.messesList.filter(m=>!(Math.abs(m.x-target.x)<0.6&&Math.abs(m.z-target.z)<0.6));
        j.state="search"; j.lastKnown=null; j.searchTimer=0; j.cleanTarget=null;
        Sound.lockerSlam();
        updateMood();
      }
    }
  } else if(j.state==="chase"){
    speed=chaseSpeed;
    if(j.lastKnown) target=j.lastKnown;
    if(G.hidden||dToP>21){ j.searchTimer+=dt; if(j.searchTimer>3.2){ j.state="search"; j.searchTimer=0; updateMood(); } }
    else j.searchTimer=0;
  } else if(j.state==="investigate"){
    target=j.investigate; j.investigateTimer-=dt; speed=patrolSpeed*1.15;
    if(j.investigateTimer<=0||(target&&dist(j.x,j.y,target.x,target.y||target.z)<1.2)){ j.state="search"; j.searchTimer=0; }
  } else if(j.state==="search"){
    speed=patrolSpeed*0.85;
    if(j.lastKnown) target=j.lastKnown;
    j.searchTimer+=dt;
    if(j.searchTimer>6.5){ j.state="patrol"; j.lastKnown=null; updateMood(); }
  } else {
    const pts=G.patrolMop||PERIODS[0].mop;
    const pt=snapWalk.apply(null,pts[j.patrolIdx%pts.length]);
    target={x:pt[0]*T+T/2,y:pt[1]*T+T/2};
    if(dist(j.x,j.y,target.x,target.y)<1.1) j.patrolIdx=(j.patrolIdx+1)%pts.length;
  }
  if(target) moveAlongPath(j,target,speed,dt);

  /* proximity audio cues */
  const hum=clamp(1-dToP/26,0,1);
  Sound.setHum(G.hidden?hum*0.6:hum);
  G.heartTimer-=dt;
  if(dToP<13&&G.heartTimer<=0&&!G.hidden){
    G.heartTimer=clamp(dToP/13,0.34,1.05);
    Sound.heartbeat(clamp(1-dToP/13,0,1));
  }
  G.dangerLevel = j.state==="chase" ? 1 : clamp(1-dToP/18,0,0.95);
}

/* ============================== PATTY, hall monitor ============================== */
function updatePatty(dt){
  const pa=G.patty, p=G.player, d=DIFF[G.difficulty];
  if(pa.cooldown>0) pa.cooldown-=dt;
  if(pa.investigateTimer>0) pa.investigateTimer-=dt;
  const dToP=dist(pa.x,pa.y,p.x,p.y);

  pa.losTimer-=dt;
  if(!G.hidden && pa.telegraph<=0 && pa.cooldown<=0 && pa.state!=="write" && pa.losTimer<=0){
    pa.losTimer=0.22;
    const cone=(pa.state==="approach")?2.2:0.95;
    if(dToP<13.5 && !losBlocked(pa.x,pa.y,p.x,p.y) && inFront(pa,p.x,p.y,cone)){
      if(pa.state!=="approach"){
        pa.state="approach"; Sound.whistle(); G.glitch=Math.max(G.glitch,0.35);
        toast(choice(PATTY_SPOT),3400);
      }
      pa.target={x:p.x,y:p.y};
    }
  }
  let speed=d.patty, target=null;
  if(pa.telegraph>0){
    /* clipboard up, pencil out — you have this long to show a pass */
    pa.telegraph-=dt;
    speed=0;
    if(pa.telegraph<=0){ giveSlip(); return; }
  } else if(pa.state==="approach"){
    speed=d.patty*1.75;
    if(pa.target) target=pa.target;
    if(dToP<2.4){ pa.state="write"; pa.telegraph=2.0; Sound.slip(); }
    else if(dToP>17||G.hidden){ pa.cooldown=3; pa.state="patrol"; }
  } else if(pa.state==="investigate"){
    speed=d.patty*1.2; target=pa.target;
    if(pa.investigateTimer<=0||(target&&dist(pa.x,pa.y,target.x,target.y)<1.2)){ pa.state="patrol"; }
  } else {
    const pts=G.patrolPatty||PERIODS[0].patty;
    const pt=snapWalk.apply(null,pts[pa.patrolIdx%pts.length]);
    target={x:pt[0]*T+T/2,y:pt[1]*T+T/2};
    if(dist(pa.x,pa.y,target.x,target.y)<1.1) pa.patrolIdx=(pa.patrolIdx+1)%pts.length;
  }
  if(target&&speed>0) moveAlongPath(pa,target,speed,dt);
  else pa.walk+=dt*0.6;
}
function giveSlip(){
  const pa=G.patty, p=G.player;
  G.slips++;
  Sound.slip(); Sound.whistle();
  toast(choice(PATTY_SLIP),4600);
  pa.telegraph=0; pa.cooldown=11; pa.state="patrol"; pa.target=null;
  /* she tells Mr. Mop. It is in the handbook. */
  const j=G.mop;
  j.lastKnown={x:p.x,y:p.y};
  if(j.state==="patrol"||j.state==="search"||j.state==="investigate"){
    j.state="investigate"; j.investigate={x:p.x,y:p.y}; j.investigateTimer=8; j.path=[];
  }
  G.glitch=Math.max(G.glitch,0.8);
  const maxSlips=DIFF[G.difficulty].slips;
  if(G.slips>=maxSlips){ detention(); return; }
  toast("📝 Tardy slip "+G.slips+" of "+maxSlips+". Patty is telling Mr. Mop where you are.",5200);
  updateObjective();
  persistSave();
}

/* ============================== bell schedule ============================== */
function updateSchedule(dt){
  if(G.state!=="playing") return;
  if(!G.bellRung){
    G.periodTimer-=dt;
    if(G.periodTimer<=0&&G.periodIdx>=0){
      G.periodCount++;
      G.periodIdx=(G.periodIdx+1)%PERIODS.length;
      const per=PERIODS[G.periodIdx];
      G.periodTimer=DIFF[G.difficulty].period;
      G.patrolMop=per.mop; G.patrolPatty=per.patty;
      G.mop.patrolIdx=0; G.patty.patrolIdx=0;
      Sound.chime();
      toast("📣 "+per.name+" — "+choice(PA_LINES),6500);
      updateMood(); persistSave();
    }
  }
  G.paTimer-=dt;
  if(G.paTimer<=0){
    G.paTimer=rand(28,48);
    Sound.chime();
    toast("📣 "+choice(PA_LINES),5600);
  }
  updateMood();
}
function updateMood(){
  if(!G) return;
  let m="calm";
  const per=(G.periodIdx>=0&&PERIODS[G.periodIdx])?PERIODS[G.periodIdx]:null;
  if(per&&per.danger==="safe") m="safe";
  if(per&&per.danger==="tense") m="tense";
  if(G.towerUnlocked&&!G.bellRung) m="tense";
  const dToP=dist(G.mop.x,G.mop.y,G.player.x,G.player.y);
  if(G.mop.state==="chase"||dToP<7.5) m="hunt";
  else if(dToP<15&&m==="calm") m="tense";
  if(G.hidden) m="safe";
  if(G.bellRung) m="finale";
  if(G.map==="tower"&&!G.bellRung) m="dark";
  if(m!==Sound.mood) Sound.setMood(m);
  G.mood=m;
}

/* ============================== tower & bell ============================== */
function tryTower(){
  if(!G.towerUnlocked){
    Sound.error();
    toast("🔒 Chained. A small brass padlock, and a note in crayon: ONLY AT THE END OF THE DAY.");
    return;
  }
  enterTower();
}
function enterTower(silent){
  const schoolPos={x:G.player.x,y:G.player.y,yaw:G.player.yaw};
  G.schoolReturn=schoolPos;
  G.map="tower";
  buildMap("tower"); Level.build(); buildHotspots();
  G.player.x=6*T+T/2; G.player.y=10*T+T/2; G.player.yaw=Math.PI; G.player.pitch=0;
  G.player.vx=0; G.player.vz=0;
  G.fade=1; G.fadeDir=-1;
  /* Mr. Mop waits downstairs — he cannot come up. Yet. */
  G.mopStairs=true;
  if(!silent){
    Sound.door(true); Sound.footstepFar();
    toast("The stairs are shorter than they should be. Twenty-eight years of them, and only eight steps.",6000);
    updateMood();
  }
  persistSave();
}
function applySecretOpen(){
  if(!G||!G.secretOpen) return;
  for(let y=0;y<mapH();y++) for(let x=0;x<mapW();x++) if(grid[y][x]===25) grid[y][x]=0;
}
function leaveTower(){
  G.map="school";
  buildMap("school");
  applySecretOpen();                       // persistent world changes come first
  Level.build(); buildHotspots();
  G.player.x=45*T+T/2; G.player.y=2*T+T/2; G.player.yaw=-Math.PI/2; G.player.pitch=0;
  G.player.vx=0; G.player.vz=0;
  G.mopStairs=false;
  G.fade=1; G.fadeDir=-1;
  if(G.bellRung){
    /* he was waiting at the foot of the stairs. of course he was. */
    G.mop.x=43*T+1; G.mop.y=3*T+1; G.mop.state="chase";
    G.mop.lastKnown={x:G.player.x,y:G.player.y}; G.mop.path=[]; G.mop.stun=0;
    G.patty.x=40*T+1; G.patty.y=2*T+1;
    Sound.sting(); G.shake=Math.max(G.shake,0.6);
    toast("He is at the bottom of the stairs. RUN.",4200);
  }
  updateMood();
  persistSave();
}
function ringBell(){
  if(G.bellRung){ toast("The bell is still ringing. It will ring for a while."); return; }
  G.bellRung=true; G.exitUnlocked=true; G.bellT=0;
  Sound.bell(); Sound.bell();
  G.flash=1.0; G.shake=0.9; G.glitch=2.0;
  /* every clock in the building moves to 4:48 */
  try{ R3.setTexture("clock", Tex.clockAt(4,48)); }catch(e){}
  /* he heard that. he is devastated. he is coming. */
  G.mop.stun=3.6; G.mop.state="chase";
  openReader("THE BELL",
    "You pull the rope.\n\n"+
    "The bell does not want to ring. It has not rung in twenty-eight years and it has opinions about that. "+
    "Then something in the tower lets go, and the sound comes out anyway — huge, brass, wrong, beautiful.\n\n"+
    "It goes through the floor. It goes through the walls. Downstairs, in every hallway at once, you hear him stop.\n\n"+
    "The clocks move. All of them. 4:48.\n\n"+
    "The day is over.\n\n"+
    "The front doors are unchained. Now run — he does not want the day to be over, and he knows exactly where you are.");
  updateObjective(); updateMood(); persistSave();
}
function tryExit(){
  if(!G.exitUnlocked){
    Sound.error();
    G.shake=Math.max(G.shake,0.15);
    if(!G.towerUnlocked) toast("🔒 Chained from the outside. The day isn't over. (Find your "+(8-G.pagesGot.length)+" remaining diary pages.)",5200);
    else toast("🔒 Still chained. The day ends when the BELL rings. East hall — the stairs.",5200);
    return;
  }
  winGame();
}

/* ============================== reader & toast ============================== */
let toastTimer=null;
function toast(msg,dur){
  const el=$("hud-toast"); if(!el) return;
  el.textContent=msg; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"), dur||3600);
}
function openReader(head,body){
  $("reader-head").textContent=head;
  $("reader-body").textContent=body;
  $("reader").classList.remove("hidden");
  if(G) G.state="reading";
  Sound.hover();
}
function closeReader(){
  $("reader").classList.add("hidden");
  if(G&&G.state==="reading"){ G.state="playing"; updateMood(); }
  Sound.click();
  if(G&&G.bellRung&&G.map==="tower"){ setTimeout(()=>{ if(G&&G.map==="tower"&&G.bellRung) leaveTower(); },900); }
}
$("reader-close").addEventListener("click",closeReader);
$("reader").addEventListener("click",e=>{ if(e.target.id==="reader") closeReader(); });

/* ============================== flow ============================== */
function showScreen(id){
  ["screen-title","screen-how","screen-settings","screen-pause","screen-over","screen-win","screen-intro","screen-detention"]
    .forEach(s=>{ const el=$(s); if(el) el.classList.toggle("hidden", s!==id); });
  const playing = G&&(G.state==="playing"||G.state==="reading"||G.state==="paused");
  $("hud").classList.toggle("hidden", !playing);
  const tc=$("touch-controls");
  if(tc) tc.classList.toggle("hidden", !(playing&&isTouchDevice()));
}
function startGame(diff,ngPlus){
  Sound.init(); Sound.startAmbient(); Sound.startMusic();
  G=newGameState(diff,ngPlus);
  G.state="intro";
  showScreen("screen-intro");
}
function beginPlay(){
  if(!G) return;
  G.state="playing"; G.fade=1; G.fadeDir=-1;
  showScreen(null);
  updateObjective(); updateMood(); updateHUD();
  toast("Find your 8 diary pages. Milo — do not run in the halls. He hears it.",6500);
  persistSave();
  if(!isTouchDevice()&&!pointerLocked){ const cv=$("game"); if(cv.requestPointerLock){ try{ cv.requestPointerLock(); }catch(e){} } }
}
function pauseGame(){
  if(!G||G.state!=="playing") return;
  G.state="paused"; showScreen("screen-pause"); persistSave();
  Sound.setHum(0);
  if(document.exitPointerLock&&pointerLocked){ try{ document.exitPointerLock(); }catch(e){} }
}
function resumeGame(){
  if(!G||G.state!=="paused") return;
  G.state="playing"; showScreen(null); updateMood();
  if(!isTouchDevice()){ const cv=$("game"); if(cv&&cv.requestPointerLock){ try{ cv.requestPointerLock(); }catch(e){} } }
}
function caught(){
  if(!G||G.state!=="playing") return;
  G.state="scare"; G.scareT=1.7; G.caught=true;
  Sound.sting(); Sound.scare(); Sound.setHum(0);
  if(settings.shake) G.shake=0.95;
  G.flash=0.5;
  setTimeout(()=>{
    if(!G||G.state!=="scare") return;
    G.state="over"; Sound.lose();
    $("over-text").textContent=choice([
      "Mr. Mop only wanted to talk. He talks for a very, very long time. Somewhere in the middle of it the sun goes down, and he does not notice, and neither do you.",
      "He hums you to sleep. You wake up in the janitor's closet on a folding chair. The clock in the hall says 4:47. It is a beautiful day. It is a beautiful day.",
      "\"There you are,\" he says, and he is so glad. That is the worst part. He is so glad.\n\nYou are part of the school now. The school is part of the day. The day does not end. The bell never rings."
    ]);
    showScreen("screen-over");
  },1750);
}
function detention(){
  if(!G||G.state!=="playing") return;
  G.state="detention";
  Sound.slip(); Sound.whistle(); Sound.lose();
  Sound.setHum(0);
  $("detention-text").textContent=
    "Patty takes your hand. Her hand is cold and very small and very firm.\n\n"+
    "Detention is in Room 101. There are thirty-one other students in detention. There have been thirty-one other students in detention since 1997. They are all sitting perfectly still, because the day is not over and you do not get up until the bell rings.\n\n"+
    "You sit down. The sun is shining. The clock says 4:47.\n\n"+
    "You have "+G.slips+" tardy slips. Patty puts them in a folder. The folder is full.";
  showScreen("screen-detention");
}
function winGame(){
  if(!G) return;
  G.state="win"; G.won=true;
  const secret=G.tapesGot.length>=5;
  G.ending=secret?"secret":"normal";
  if(secret){ Sound.secretWin(); setFlag(SECRET_KEY,"1"); } else Sound.win();
  Sound.setHum(0);
  setFlag(WON_KEY,"1");
  clearSave();
  refreshTitle();                      // NG+ appears on the title the moment you have won
  $("win-title").textContent = secret ? "THE BELL NEVER RINGS" : "YOU ESCAPED";
  $("win-text").textContent = secret
    ? "You burst through the front doors and the sunlight is so bright you have to put your hand up.\n\nBehind you the bell is still going. It will go for a while. Twenty-eight years of un-rung bells do not stop on the first try.\n\nYou found every tape. You know what happened here: a boy made a wish on nine candles, and something in the cafeteria window waved back, and the day closed around the school like a fist.\n\nThe school lets you go. It keeps a copy.\n\nSomewhere a clock ticks from 4:47 to 4:48. Somewhere a janitor stops mopping and looks up, and for the first time in twenty-eight years he does not know what to do with his hands.\n\nSomewhere a girl with a clipboard ticks your name off a list, and the list gets shorter by one.\n\nSECRET ENDING — THE BELL NEVER RINGS"
    : "You hit the front doors at a run and they give, and the sunlight is so bright it is white, and then it is cold air and grass and a street and 1997 pretending to be over.\n\nBehind you the bell goes on ringing. You do not look back. You never look back.\n\n...but some nights you still hear it. And some nights, just before you fall asleep, a man hums somewhere in the wall of the house, and the hallway of the house is a little longer than it was, and the clock on the microwave says 4:47.\n\nTHE DAY ENDED. YOU GOT OUT.";
  const mm=Math.floor(G.time/60), ss=Math.floor(G.time%60);
  $("win-stats").innerHTML =
    "⏱ "+mm+":"+String(ss).padStart(2,"0")+
    " &nbsp;·&nbsp; 📄 "+G.pagesGot.length+"/8 pages"+
    " &nbsp;·&nbsp; 📼 "+G.tapesGot.length+"/5 tapes"+
    " &nbsp;·&nbsp; 📝 "+G.slips+" slips"+
    "<br>Difficulty: "+DIFF[G.difficulty].label+(G.ngPlus?" · Night 2 (NG+)":"")+
    (secret?"<br>🏆 SECRET ENDING UNLOCKED":"<br>Find all 5 hidden tapes for the secret ending.")+
    (flag(SECRET_KEY)&&!secret?"<br>You have seen the secret ending before.":"");
  showScreen("screen-win");
}
function quitToTitle(){
  Sound.setHum(0);
  if(G&&(G.state==="paused"||G.state==="playing"||G.state==="reading")) persistSave();
  $("reader").classList.add("hidden");
  G=null;
  refreshTitle();
  showScreen("screen-title");
}
function updateObjective(){
  if(!G) return;
  const el=$("hud-objective");
  if(G.exitUnlocked) el.textContent="🚪 RUN — FRONT DOORS, SOUTH HALL";
  else if(G.towerUnlocked) el.textContent="🔔 RING THE BELL — east hall, up the stairs";
  else el.textContent="📄 Diary pages "+G.pagesGot.length+"/8";
  const per=(G.periodIdx>=0&&PERIODS[G.periodIdx])?PERIODS[G.periodIdx]:(G.towerUnlocked?FINAL_PERIOD:null);
  $("hud-period").textContent = G.bellRung ? "FINAL PERIOD" : (per?per.name:"—");
  const maxSlips=DIFF[G.difficulty].slips;
  $("slips-count").textContent=G.slips+"/"+maxSlips;
}

/* ============================== HUD ============================== */
function updateHUD(){
  if(!G) return;
  $("pages-count").textContent=G.pagesGot.length;
  $("tapes-count").textContent=G.tapesGot.length;
  $("soda-count").textContent=G.soda;
  $("pass-count").textContent=G.pass;
  $("mess-count").textContent=G.messes;
  $("stamina-fill").style.width=G.stamina+"%";
  $("stamina-fill").style.background=G.stamina<28?"#e4572e":"#7fc97f";
  const mm=Math.floor(G.time/60), ss=Math.floor(G.time%60);
  $("hud-time").textContent="4:47";
  $("hud-clock-real").textContent=String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");
  const maxSlips=DIFF[G.difficulty].slips;
  $("slips-count").textContent=G.slips+"/"+maxSlips;
  $("hud-slips").classList.toggle("bad", G.slips>=maxSlips-1);
  /* interact prompt from the look raycast */
  const tg=G.lookTarget;
  const hi=$("hud-interact");
  if(tg&&!G.hidden){ hi.classList.remove("hidden"); $("interact-label").textContent=tg.label; }
  else if(G.hidden){ hi.classList.remove("hidden"); $("interact-label").textContent="Get out of the locker"; }
  else hi.classList.add("hidden");
  /* danger */
  const j=G.mop;
  const dToP=dist(j.x,j.y,G.player.x,G.player.y);
  $("hud-danger").classList.toggle("hidden", !(j.state==="chase"||dToP<7));
  $("hud-danger").textContent = j.state==="chase" ? "⚠ HE SEES YOU ⚠" : "⚠ HE'S CLOSE ⚠";
  /* Patty telegraph */
  const pw=$("hud-patty");
  if(G.patty.telegraph>0){
    pw.classList.remove("hidden");
    pw.textContent="📝 PATTY IS WRITING A SLIP — SHOW YOUR PASS  [T]  ("+G.patty.telegraph.toFixed(1)+")";
  } else pw.classList.add("hidden");
  /* cleaning indicator: the tactical read-out */
  $("hud-mopstate").textContent = j.state==="cleaning" ? "🧹 cleaning the mess" : (j.state==="chase"?"🧹 HUNTING":(j.state==="search"?"🧹 searching":""));
}

/* ============================== characters ============================== */
const MOP_SC=1.2, PATTY_SC=1.0;
function limb(name, cx, cz, y, yaw, pitch, sc, lat){
  /* lat: lateral offset in metres, applied perpendicular to facing */
  const x = cx + Math.cos(yaw)*lat, z = cz - Math.sin(yaw)*lat;
  R3.drawMesh(Models.get(name), {x:x, y:y, z:z, yaw:yaw, pitch:pitch||0, scale:sc}, 1.0);
}
function drawMrMop(cam,t){
  const j=G.mop;
  const dx=j.x-cam.x, dz=j.y-cam.z;
  if(dx*dx+dz*dz > (VIEW_TILES*T)*(VIEW_TILES*T)) return;
  if(losBlocked(cam.x,cam.z,j.x,j.y)) return;
  const s=MOP_SC, yaw=j.yaw;
  const walk=j.walk;
  const swing = (j.state==="cleaning") ? Math.sin(t*7)*0.42 : Math.sin(walk*2.1)*0.52;
  const stun = j.stun>0;
  const hipY = 0.66*s, shY = (0.66+0.62)*s, headY = shY + 0.17*s;
  if(stun){
    /* frozen mid-step, head down, devastated */
    limb("mopLeg", j.x, j.y, hipY, yaw,  0.30, s,  0.13*s);
    limb("mopLeg", j.x, j.y, hipY, yaw, -0.30, s, -0.13*s);
    limb("mopTorso", j.x, j.y, hipY, yaw, 0.22, s, 0);
    limb("mopHead", j.x, j.y, headY-0.06, yaw, 0.55, s, 0);
    limb("mopArm", j.x, j.y, shY, yaw, 0.15, s, 0.32*s);
    limb("mopArm", j.x, j.y, shY, yaw, 0.15, s, -0.32*s);
  } else {
    limb("mopLeg", j.x, j.y, hipY, yaw,  swing, s,  0.13*s);
    limb("mopLeg", j.x, j.y, hipY, yaw, -swing, s, -0.13*s);
    limb("mopTorso", j.x, j.y, hipY, yaw, Math.sin(walk*2.1)*0.05, s, 0);
    limb("mopHead", j.x, j.y, headY + Math.sin(walk*4.2)*0.012, yaw, (j.state==="chase"?-0.18:0.05), s, 0);
    /* left arm holds the bucket, right arm guides the mop */
    limb("mopArm", j.x, j.y, shY, yaw, -swing*0.7 + (j.state==="chase"?-0.5:0.1), s,  0.33*s);
    limb("mopArm", j.x, j.y, shY, yaw,  swing*0.7 + (j.state==="chase"?-0.9:0.25), s, -0.33*s);
  }
  /* bucket in the left hand */
  const bLat = 0.46*s;
  R3.drawMesh(Models.get("bucket"), {x:j.x+Math.cos(yaw)*bLat, y:0.02+Math.abs(Math.sin(walk*2.1))*0.05, z:j.y-Math.sin(yaw)*bLat, yaw:yaw, scale:s*0.95}, 1.0);
  /* the mop: pushed in front of him when cleaning, trailed behind when walking */
  const clean = j.state==="cleaning";
  const mopF = clean ? 0.95 : -0.55;
  const mopPitch = clean ? (0.42+Math.sin(t*7)*0.30) : 0.16;
  R3.drawMesh(Models.get("mop"), {
    x: j.x + Math.sin(yaw)*mopF + Math.cos(yaw)*0.30*s,
    y: 0, z: j.y + Math.cos(yaw)*mopF - Math.sin(yaw)*0.30*s,
    yaw: yaw + (clean?Math.sin(t*7)*0.25:0), pitch: mopPitch, scale: s
  }, 1.0);
  /* his shadow: a soft dark quad keeps him planted in the daylight */
  shadowQuad(j.x, j.y, 0.52*s, yaw, 0.30);
}
function drawPatty(cam,t){
  const pa=G.patty;
  const dx=pa.x-cam.x, dz=pa.y-cam.z;
  if(dx*dx+dz*dz > (VIEW_TILES*T)*(VIEW_TILES*T)) return;
  if(losBlocked(cam.x,cam.z,pa.x,pa.y)) return;
  const s=PATTY_SC, yaw=pa.yaw, walk=pa.walk;
  const writing = pa.telegraph>0;
  const swing = writing ? 0 : Math.sin(walk*2.4)*0.5;
  const hipY=0.5*s, shY=(0.5+0.46)*s, headY=shY+0.15*s;
  limb("pattyLeg", pa.x, pa.y, hipY, yaw,  swing, s,  0.10*s);
  limb("pattyLeg", pa.x, pa.y, hipY, yaw, -swing, s, -0.10*s);
  limb("pattyTorso", pa.x, pa.y, hipY, yaw, Math.sin(walk*2.4)*0.04, s, 0);
  limb("pattyHead", pa.x, pa.y, headY+Math.sin(walk*4.8)*0.01, yaw, writing?0.42:-0.05, s, 0);
  if(writing){
    /* both arms up, clipboard out, pencil going */
    limb("pattyArm", pa.x, pa.y, shY, yaw, -1.35, s,  0.20*s);
    limb("pattyArm", pa.x, pa.y, shY, yaw, -1.15+Math.sin(t*13)*0.18, s, -0.20*s);
    R3.drawMesh(Models.get("clipboard"), {x:pa.x+Math.sin(yaw)*0.34, y:shY-0.30, z:pa.y+Math.cos(yaw)*0.34, yaw:yaw, pitch:-0.9, scale:s}, 1.0);
  } else {
    limb("pattyArm", pa.x, pa.y, shY, yaw, -swing*0.8, s,  0.20*s);
    limb("pattyArm", pa.x, pa.y, shY, yaw,  swing*0.8, s, -0.20*s);
    if(pa.state==="approach"){
      /* one arm points at you */
      R3.drawMesh(Models.get("clipboard"), {x:pa.x+Math.sin(yaw)*0.28, y:shY-0.34, z:pa.y+Math.cos(yaw)*0.28, yaw:yaw, pitch:-0.5, scale:s}, 1.0);
    }
  }
  /* whistle on a lanyard */
  R3.drawMesh(Models.get("whistle"), {x:pa.x+Math.sin(yaw)*0.14, y:shY-0.10, z:pa.y+Math.cos(yaw)*0.14, yaw:yaw, scale:s}, 1.0);
  shadowQuad(pa.x, pa.y, 0.40*s, yaw, 0.26);
}
function shadowQuad(x,z,rad,yaw,alpha){
  const c=Math.cos(yaw), sN=Math.sin(yaw);
  const ax=x+c*rad, az=z-sN*rad, bx=x-c*rad, bz=z+sN*rad;
  const fx=x+sN*rad*0.7, fz=z+c*rad*0.7, gx=x-sN*rad*0.7, gz=z-c*rad*0.7;
  R3.quadWorld(camRef,[ax,0.012,az],[bx,0.012,bz],[gx,0.012,gz],[fx,0.012,fz],[1,1],alpha,TEX_SHADOW,0);
}

/* ============================== world extras ============================== */
function drawDoors(cam){
  for(const k in doors){
    const d=doors[k];
    const wx=(d.x+0.5)*T, wz=(d.y+0.5)*T;
    const dx=wx-cam.x, dz=wz-cam.z;
    if(dx*dx+dz*dz > (VIEW_TILES*T)*(VIEW_TILES*T)) continue;
    const yaw=faceYaw(d.x,d.y);
    if(d.tower) continue;              /* the stairwell door is an open arch */
    if(d.open){
      /* swing the panel open about its hinge */
      const th=1.15, hx=wx+Math.cos(yaw)*0.95, hz=wz-Math.sin(yaw)*0.95;
      const px=-0.95;
      R3.drawMesh(Models.get("doorWood"), {x:hx, y:0, z:hz, yaw:yaw+th, px:px}, 0.98);
    } else {
      R3.drawMesh(Models.get("doorWood"), {x:wx, y:0, z:wz, yaw:yaw}, 1.0);
    }
  }
}
function drawExitDoors(cam,t){
  if(curMap!=="school") return;
  const wx=24*T, wz=31*T+T/2;
  const dx=wx-cam.x, dz=wz-cam.z;
  if(dx*dx+dz*dz > (VIEW_TILES*T)*(VIEW_TILES*T)) return;
  const mesh = G.exitUnlocked ? Models.get("exitDoorsOpen") : Models.get("exitDoors");
  R3.drawMesh(mesh, {x:wx, y:0, z:wz, yaw:Math.PI}, 1.0);
  if(!G.exitUnlocked){
    /* padlock glint */
    R3.drawMesh(Models.get("whistle"), {x:wx, y:1.42+Math.sin(t*2)*0.01, z:wz-0.2, yaw:0, scale:1.6}, 1.2);
  }
}
function drawPickups(cam,t){
  const list=G.pickups;
  for(let i=0;i<list.length;i++){
    const pk=list[i];
    if(pk.got) continue;
    const dx=pk.x-cam.x, dz=pk.z-cam.z;
    if(dx*dx+dz*dz>16*16) continue;
    const dd=Math.sqrt(dx*dx+dz*dz)||1;
    if((dx*cam.fx+dz*cam.fz)/dd < -0.35) continue;
    const bob = Math.sin(t*2.1+pk.spin)*0.055;
    const spin = t*1.15+pk.spin;
    const name = pk.kind==="page"?"page":pk.kind==="tape"?"tape":pk.kind==="soda"?"sodaCan":"pass";
    const y = pk.y + bob;
    R3.drawMesh(Models.get(name), {x:pk.x, y:y, z:pk.z, yaw:spin, scale:pk.kind==="page"?1.5:1.15}, 1.25);
  }
}
function drawMesses(cam,t){
  for(const m of G.messesList){
    const dx=m.x-cam.x, dz=m.z-cam.z;
    if(dx*dx+dz*dz>(VIEW_TILES*T)*(VIEW_TILES*T)) continue;
    const s = m.t<0.35 ? (0.5+m.t*1.4) : 1;
    R3.drawMesh(Models.get("mess"), {x:m.x, y:0, z:m.z, yaw:m.seed||0, scale:s}, 1.0);
  }
}
function drawThrownPass(cam,t){
  const tp=G.thrownPass;
  if(!tp) return;
  R3.drawMesh(Models.get("pass"), {x:tp.x, y:0.25+Math.abs(Math.sin(tp.t*7))*0.35*(1-tp.t/2), z:tp.z, yaw:tp.t*9, scale:1.3}, 1.2);
}
function drawParticles(cam){
  for(const p of G.particles){
    const dx=p.x-cam.x, dz=p.z-cam.z;
    if(dx*dx+dz*dz>14*14) continue;
    R3.quadWorld(cam,
      [p.x-p.size,p.y-p.size,p.z],[p.x+p.size,p.y-p.size,p.z],
      [p.x+p.size,p.y+p.size,p.z],[p.x-p.size,p.y+p.size,p.z],
      [1,1],1.35,R3.texIndex("ceil_light"),0);
  }
}
/* when you hide, the locker prop for your tile is skipped and this draws the
   interior frame + daylight slats, so the hallway shows through the gaps */
function drawLockerPeek(cam){
  const p=G.player, yaw=p.yaw;
  const c=Math.cos(yaw), sN=Math.sin(yaw);
  const lat=(ox,dep,y0,y1,tex,sh)=>{
    const bx=p.x+sN*dep, bz=p.y+c*dep;
    R3.quadWorld(cam,
      [bx+c*ox[0],y0,bz-sN*ox[0]], [bx+c*ox[1],y0,bz-sN*ox[1]],
      [bx+c*ox[1],y1,bz-sN*ox[1]], [bx+c*ox[0],y1,bz-sN*ox[0]],
      [1,1],sh,tex,0);
  };
  const side=R3.texIndex("locker_side"), front=R3.texIndex("locker");
  /* close side walls of the locker, dark */
  lat([-0.62,-0.34],0.42,0,2.1,side,0.42);
  lat([0.34,0.62],0.42,0,2.1,side,0.42);
  lat([-0.62,0.62],0.40,1.72,2.1,side,0.36);
  lat([-0.62,0.62],0.40,0,0.20,side,0.34);
  /* five horizontal slats across the middle of the view */
  for(let i=0;i<5;i++){
    const y0=0.30+i*0.29;
    lat([-0.62,0.62],0.78,y0,y0+0.085,front,0.85);
  }
  /* the locker door frame, very close, so the edges of the screen go dark */
  lat([-1.5,-0.60],0.30,0,2.4,side,0.30);
  lat([0.60,1.5],0.30,0,2.4,side,0.30);
}

/* ============================== renderer ============================== */
let camRef=null, TEX_SHADOW=-1, cv=null, ctx=null, IW=320, IH=200, bootOk=false;
let saveTimer=0, hudTimer=0, belowTimer=6;

function softShadowTex(){
  return Tex.mk(16,16,(x,y)=>{
    const dx=(x+0.5)/16-0.5, dy=(y+0.5)/16-0.5;
    const r=Math.sqrt(dx*dx+dy*dy)*2;
    if(r>0.98) return 0;                       // colour key: transparent
    const k=clamp(1-r,0,1);
    const v=Math.round(6+(1-k*k)*46);
    return Tex.pack(v,v-2,v-6);
  });
}
function registerTextures(){
  const all=Tex.all();
  for(const k in all) R3.setTexture(k, all[k]);
  TEX_SHADOW = R3.setTexture("soft_shadow", softShadowTex());
  R3.sky = Tex.pack(198,216,236);
}
function applyLook(){
  const tower = G&&G.map==="tower";
  /* broad daylight: warm white haze, long draw distance, no dark falloff */
  if(tower) R3.setFog(228,226,216,3,13);
  else R3.setFog(238,236,222,6,21);
  R3.setFov(settings.res==="high"?70:74);
}
function resize(){
  if(!cv) return;
  const base=RES[settings.res]||RES.normal;
  const rect=cv.getBoundingClientRect();
  const aspect=(rect.width>4&&rect.height>4)?(rect.width/rect.height):(16/10);
  IH=base.h;
  IW=clamp(Math.round(IH*aspect),192,640);
  cv.width=IW; cv.height=IH;
  R3.init(IW,IH);
  applyLook();
  $("hud-fps") && ($("hud-fps").textContent=IW+"x"+IH);
}
function propFilter(p){
  if(!G) return false;
  if(p.tag==="exit") return true;                     /* drawn by drawExitDoors */
  if(p.tag==="towerdoor"&&G.towerUnlocked) return true;
  if(G.hidden&&p.tile===4&&G.hiddenLocker&&p.tx===G.hiddenLocker.x&&p.ty===G.hiddenLocker.y) return true;
  return false;
}
function makeCam(t){
  const p=G.player;
  let sh=0, sh2=0;
  if(G.shake>0&&settings.shake){
    sh=Math.sin(t*47)*0.05*G.shake;
    sh2=Math.cos(t*39)*0.04*G.shake;
  }
  const hidden = G.hidden;
  const eyeY = hidden ? 1.16 : EYE + p.bob*0.045;
  return M3.makeCamera({x:p.x, y:eyeY, z:p.y}, p.yaw+sh, p.pitch+sh2);
}
function scareCam(t){
  const j=G.mop, p=G.player;
  /* the camera snaps to just in front of his face and looks up at him */
  const d=1.05+Math.sin(t*9)*0.03;
  const cx=j.x-Math.sin(j.yaw)*d, cz=j.y-Math.cos(j.yaw)*d;
  return M3.makeCamera({x:cx, y:1.42, z:cz}, j.yaw+Math.PI+Math.sin(t*23)*0.03, 0.16+Math.sin(t*17)*0.02);
}
function drawWorld(t,cam){
  camRef=cam;
  R3.begin(cam);
  Level.draw(cam);
  Level.drawProps(cam, propFilter);
  drawDoors(cam);
  drawExitDoors(cam,t);
  drawMesses(cam,t);
  drawPickups(cam,t);
  drawThrownPass(cam,t);
  if(G.map==="school"){ drawMrMop(cam,t); drawPatty(cam,t); }
  drawParticles(cam);
  if(G.hidden) drawLockerPeek(cam);
  R3.present(ctx,IW,IH);
}
function postFx(t){
  if(!ctx) return;
  const W=IW, H=IH, cx=W/2, cy=H/2;
  /* sun bloom: a warm wash that breathes, so daylight feels like daylight */
  const g=ctx.createRadialGradient(cx,cy*0.86,H*0.10,cx,cy,H*0.95);
  g.addColorStop(0,"rgba(255,246,214,0.14)");
  g.addColorStop(0.55,"rgba(255,240,205,0.05)");
  g.addColorStop(1,"rgba(40,44,66,0.30)");
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  /* danger pulse at the screen edges when he is hunting */
  const j=G.mop;
  if(G.map==="school"&&(j.state==="chase"||G.dangerLevel>0.55)&&!G.hidden){
    const a=clamp((j.state==="chase"?0.42:0.2)*(0.6+0.4*Math.sin(t*7)),0,0.5);
    const rg=ctx.createRadialGradient(cx,cy,H*0.28,cx,cy,H*0.85);
    rg.addColorStop(0,"rgba(180,30,20,0)");
    rg.addColorStop(1,"rgba(190,26,22,"+a.toFixed(3)+")");
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
  }
  /* hiding: heavy dark vignette, you are in a metal box */
  if(G.hidden){
    const vg=ctx.createRadialGradient(cx,cy,H*0.16,cx,cy,H*0.72);
    vg.addColorStop(0,"rgba(0,0,0,0)");
    vg.addColorStop(1,"rgba(0,0,0,0.80)");
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  }
  /* glitch: slice displacement, straight off the internal buffer */
  if(G.glitch>0.02&&R3.off){
    const n=Math.min(9,Math.floor(G.glitch*5)+1);
    for(let i=0;i<n;i++){
      const sy=(Math.random()*H)|0, sh=Math.max(1,(Math.random()*H*0.09)|0);
      const off=((Math.random()-0.5)*W*0.16*G.glitch)|0;
      try{ ctx.drawImage(R3.off,0,sy,W,sh,off,sy,W,sh); }catch(e){}
      if(Math.random()<0.5){
        ctx.fillStyle=Math.random()<0.5?"rgba(255,80,80,0.10)":"rgba(90,220,255,0.10)";
        ctx.fillRect(0,sy,W,sh);
      }
    }
  }
  /* white flash */
  if(G.flash>0.01){
    ctx.fillStyle="rgba(255,252,240,"+clamp(G.flash,0,0.92).toFixed(3)+")";
    ctx.fillRect(0,0,W,H);
  }
  /* fade in / out */
  if(G.fade>0.004){
    ctx.fillStyle="rgba(0,0,0,"+clamp(G.fade,0,1).toFixed(3)+")";
    ctx.fillRect(0,0,W,H);
  }
  /* crosshair / look reticle (not on the title screen) */
  if(G.state!=="playing"&&G.state!=="reading") return;
  const hot=!!G.lookTarget;
  ctx.fillStyle=hot?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.42)";
  const s=hot?2:1;
  ctx.fillRect(cx-s,cy-s,s*2+1,s*2+1);
  if(hot){
    ctx.strokeStyle="rgba(255,255,255,0.55)"; ctx.lineWidth=1;
    ctx.strokeRect(cx-5.5,cy-5.5,11,11);
  }
}
function stepWorld(dt,t){
  G.time+=dt;
  if(G.map==="school"){
    updateSchedule(dt);
    updatePlayer(dt);
    updateMop(dt);
    updatePatty(dt);
    /* footsteps below/behind: he is always working */
    belowTimer-=dt;
    if(belowTimer<=0){ belowTimer=rand(9,20); if(dist(G.mop.x,G.mop.y,G.player.x,G.player.y)>9) Sound.footstepFar(); }
  } else {
    updatePlayer(dt);
    /* in the tower the school AI is downstairs; dread comes from the building */
    belowTimer-=dt;
    if(belowTimer<=0){
      belowTimer=rand(6,13);
      Sound.footstepFar();
      if(Math.random()<0.4) toast(choice(["Something heavy is dragged along the hall below.","The humming stops. That is worse.","Downstairs, a bucket is kicked over. On purpose."]),3600);
    }
  }
  /* thrown pass */
  if(G.thrownPass){
    G.thrownPass.t+=dt;
    if(G.thrownPass.t>2.4) G.thrownPass=null;
  }
  /* messes settle in */
  for(const m of G.messesList) if(m.t<1) m.t+=dt*2.4;
  /* particles */
  for(let i=G.particles.length-1;i>=0;i--){
    const p=G.particles[i];
    p.life-=dt;
    if(p.life<=0){ G.particles.splice(i,1); continue; }
    p.x+=p.vx*dt; p.z+=p.vz*dt; p.y+=p.vy*dt; p.vy-=3.1*dt;
    if(p.y<0.03){ p.y=0.03; p.vy*=-0.32; p.vx*=0.7; p.vz*=0.7; }
  }
  /* decay effects */
  G.glitch=Math.max(0,G.glitch-dt*1.25);
  G.shake=Math.max(0,G.shake-dt*1.6);
  G.flash=Math.max(0,G.flash-dt*2.2);
  if(G.fadeDir<0){ G.fade=Math.max(0,G.fade-dt*1.5); if(G.fade<=0) G.fadeDir=0; }
  /* what are we looking at */
  G.lookTarget = (G.state==="playing") ? lookTarget() : null;
  /* autosave */
  saveTimer-=dt;
  if(saveTimer<=0){ saveTimer=6; persistSave(); }
}
function stepScare(dt,t){
  G.scareT-=dt;
  G.glitch=Math.max(G.glitch,1.3);
  G.shake=Math.max(G.shake,0.7);
  /* he walks right up to you during the scare */
  const j=G.mop, p=G.player;
  const dx=p.x-j.x, dz=p.y-j.y, dd=Math.hypot(dx,dz)||1;
  if(dd>0.85){ j.x+=dx/dd*2.6*dt; j.y+=dz/dd*2.6*dt; }
  j.yaw=Math.atan2(p.x-j.x,p.y-j.y);
  j.walk+=dt*3.0;
  if(G.flash>0) G.flash=Math.max(0,G.flash-dt*1.2);
}
let lastNow=0;
function loop(now){
  requestAnimationFrame(loop);
  if(!G||!bootOk) { lastNow=now; return; }
  const t=now/1000;
  let dt=(now-lastNow)/1000; lastNow=now;
  if(!isFinite(dt)||dt<=0) dt=0.016;
  dt=Math.min(0.05,dt);
  const st=G.state;
  if(st==="playing") stepWorld(dt,t);
  else if(st==="scare") stepScare(dt,t);
  else if(st==="title") stepAttract(dt,t);
  else if(st==="paused"||st==="reading"||st==="intro"||st==="how"||st==="settings"){
    G.glitch=Math.max(0,G.glitch-dt*1.2);
    G.shake=Math.max(0,G.shake-dt*1.6);
    G.flash=Math.max(0,G.flash-dt*2.2);
    if(G.fadeDir<0){ G.fade=Math.max(0,G.fade-dt*1.5); if(G.fade<=0) G.fadeDir=0; }
  }
  if(st==="playing"||st==="reading"||st==="paused"||st==="scare"||st==="title"){
    const cam = (st==="scare") ? scareCam(t) : (st==="title" ? attractCam(t) : makeCam(t));
    try{ drawWorld(t,cam); postFx(t); }
    catch(err){ if(!window.__errLogged){ window.__errLogged=1; console.error(err); } }
  }
  hudTimer-=dt;
  if(hudTimer<=0&&(st==="playing"||st==="reading")){ hudTimer=0.1; updateHUD(); }
}

/* ============================== attract mode (title screen) ============================== */
function attractCam(t){
  const s=(t*0.05)%1;
  const x=(5+s*38)*T;
  const z=15.5*T+Math.sin(t*0.29)*0.42*T;
  return M3.makeCamera({x:x, y:EYE+Math.sin(t*0.83)*0.014, z:z},
                       Math.PI/2+Math.sin(t*0.21)*0.11, 0.015+Math.sin(t*0.17)*0.02);
}
function attractMode(){
  G=newGameState("normal",false);
  G.state="title";
  G.pickups=[]; G.messesList=[]; G.particles=[];
  G.mop.x=24*T; G.mop.y=16.4*T; G.mop.state="cleaning"; G.mop.cleanTimer=1e9;
  G.mop.cleanTarget={x:24*T,z:16.4*T}; G.mop.yaw=Math.PI/2;
  G.patty.x=11*T; G.patty.y=15.6*T; G.patty.state="patrol";
  G.fade=0; G.glitch=0.12; G.dangerLevel=0;
  applyLook();
}
function stepAttract(dt,t){
  G.mop.walk+=dt*2.6;
  G.patty.walk+=dt*1.5;
  G.glitch=Math.max(0.0,G.glitch-dt*0.35);
  if(Math.random()<dt*0.06) G.glitch=Math.max(G.glitch,0.5);
  if(G.fadeDir<0){ G.fade=Math.max(0,G.fade-dt*1.2); if(G.fade<=0) G.fadeDir=0; }
}

/* ============================== UI ============================== */
const INTRO_TEXT =
"RIVERSIDE ELEMENTARY · TUESDAY · 4:47 PM\n\n"+
"You stayed late to finish the diorama. Everybody else went home an hour ago. You know this because you counted the coats on the hooks twice.\n\n"+
"The sun is still up. It is a beautiful, blinding, endless afternoon — the kind of daylight that makes the hallway tiles shine like water. Nothing is hiding in the dark. There is no dark.\n\n"+
"That is the problem.\n\n"+
"You are Milo Kessler, eleven years old, and the front doors are chained. Your diary fell apart in the building: eight pages, scattered through the classrooms and halls. Somewhere below the east stairwell there is a bell that has not rung in twenty-eight years, and the day will not end until somebody rings it.\n\n"+
"Somebody is mopping the halls. He has been mopping the halls for a very long time. He hums.\n\n"+
"Do not run in the halls. He hears it.";
const HOW_TEXT =
"MOVE — W A S D  (or the left stick on touch)\n"+
"LOOK — mouse (click the screen to lock the pointer) · arrow keys · drag the right side on touch\n"+
"USE / READ / HIDE / OPEN — E  (or the ✋ button)\n\n"+
"OBJECTIVE\n"+
"Find your 8 diary pages. When you have them the east stairwell unlocks. Climb it, ring the bell, and get out through the front doors before he reaches you.\n\n"+
"MR. MOP\n"+
"He patrols on the bell schedule and he can see you from a long way off — it is broad daylight, there is nowhere dark to stand. He hears running much further than walking. Hide in a locker (look at one, press E) and stay still; if he watches you go in, he will open it.\n\n"+
"MESS — the janitor's compulsion  [F]\n"+
"You can knock things over. Spill a mess and Mr. Mop MUST clean it: he drops whatever he was doing and walks to it. It costs you one of your messes and he will remember you were nearby, but it buys you a whole hallway. Trash cans refill you — look at one and press E.\n\n"+
"PATTY, HALL MONITOR\n"+
"A girl with a clipboard and a sash patrols the halls. She cannot hurt you. She writes tardy slips, and every slip she writes tells Mr. Mop exactly where you were standing. Hold up a hall pass [T] while she is writing to talk her out of it, or throw one [R] down a hallway to pull him away.\n"+
"Enough slips and you go to detention. Detention does not end.\n\n"+
"SODA [Q] — a burst of speed and stamina. Vending machines still work.\n"+
"HALL PASS [R] — throw it: a loud decoy. [T] — show it to Patty.\n\n"+
"BELL SCHEDULE\n"+
"Every so often the PA announces a new period and everybody's route changes. Recess and Phys. Ed. put more of them in the halls. Assembly empties them into the gym. Watch the top of the screen.\n\n"+
"SECRETS\n"+
"Five tapes are hidden in the building. The library shelves are not all flush with the wall. The lost and found has a box with your name on it. The janitor's closet is worth a look, once.\n\n"+
"Milo does not have a flashlight. He does not need one. That is the worst part.";

function refreshTitle(){
  const sv=loadSave();
  $("btn-continue").classList.toggle("hidden", !sv);
  $("btn-continue").textContent = sv ? ("CONTINUE — "+(sv.map==="tower"?"bell tower":"Riverside Elementary")+" · "+(sv.pages||[]).length+"/8 pages") : "CONTINUE";
  const won=flag(WON_KEY);
  $("btn-ngplus").classList.toggle("hidden", !won);
  $("title-badge").classList.toggle("hidden", !flag(SECRET_KEY));
  $("title-diff").textContent="Difficulty: "+(DIFF[settings.difficulty]||DIFF.normal).label;
  $("title-res").textContent=(RES[settings.res]||RES.normal).label;
}
function syncSettingsUI(){
  const set=(id,v)=>{ const el=$(id); if(el) el.value=v; };
  const chk=(id,v)=>{ const el=$(id); if(el) el.checked=!!v; };
  set("range-master",Math.round(settings.master*100));
  set("range-music",Math.round(settings.music*100));
  set("range-sfx",Math.round(settings.sfx*100));
  set("range-sens",Math.round(settings.sens*100));
  set("sel-difficulty",settings.difficulty);
  set("sel-res",settings.res);
  chk("chk-crt",settings.crt); chk("chk-shake",settings.shake); chk("chk-dither",settings.dither);
  const l=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
  l("lbl-master",Math.round(settings.master*100)+"%");
  l("lbl-music",Math.round(settings.music*100)+"%");
  l("lbl-sfx",Math.round(settings.sfx*100)+"%");
  l("lbl-sens",Math.round(settings.sens*100)+"%");
  document.body.classList.toggle("no-crt", !settings.crt);
  document.body.classList.toggle("no-dither", !settings.dither);
}
function applySettings(){
  Sound.setVolumes(settings.master,settings.music,settings.sfx);
  if("dither" in R3) R3.dither = settings.dither;
  persistSettings(); syncSettingsUI(); refreshTitle();
  if(cv) resize();
}
function bindUI(){
  const on=(id,fn)=>{ const el=$(id); if(el){ el.addEventListener("click",e=>{ e.preventDefault(); Sound.hover(); fn(); }); } };
  on("btn-new",()=>{ Sound.click(); startGame(settings.difficulty,false); });
  on("btn-continue",()=>{
    const sv=loadSave();
    if(!sv){ Sound.error(); toast("No save found."); return; }
    Sound.init(); Sound.startAmbient(); Sound.startMusic(); Sound.click();
    applySave(sv); showScreen(null); updateObjective(); updateHUD();
    toast("Welcome back to Riverside. It is still 4:47.",4200);
  });
  on("btn-ngplus",()=>{
    Sound.click();
    G=newGameState(settings.difficulty,true);
    G.pagesGot=[]; G.exitUnlocked=false; G.towerUnlocked=false; G.bellRung=false;
    G.messes=DIFF[settings.difficulty].messBonus+3;
    G.state="intro";
    $("intro-text").textContent="NIGHT 2.\n\nYou escaped. The sun went down, the street was real, your mother's car was in the driveway.\n\nAnd then the clock on the microwave said 4:47, and the hallway of your own house was a little longer than it used to be, and you knew — you absolutely knew — that you had left something behind in that building.\n\nFive tapes. You did not find them all the first time.\n\nRiverside Elementary is brighter than you remember. He is faster. Patty has a new folder.\n\nGo back in.";
    showScreen("screen-intro");
  });
  on("btn-how",()=>{ $("how-text").textContent=HOW_TEXT; showScreen("screen-how"); });
  on("btn-how-back",()=>{ showScreen(G&&G.state==="paused"?"screen-pause":"screen-title"); });
  on("btn-settings",()=>{ syncSettingsUI(); showScreen("screen-settings"); });
  on("btn-settings-back",()=>{
    applySettings();
    showScreen(G&&(G.state==="paused")?"screen-pause":"screen-title");
  });
  on("btn-begin",()=>{ Sound.click(); beginPlay(); });
  on("btn-resume",()=>{ Sound.click(); resumeGame(); });
  on("btn-pause-how",()=>{ $("how-text").textContent=HOW_TEXT; showScreen("screen-how"); });
  on("btn-pause-settings",()=>{ syncSettingsUI(); showScreen("screen-settings"); });
  on("btn-quit",()=>{ Sound.click(); quitToTitle(); });
  on("btn-retry",()=>{ Sound.click(); const d=G?G.difficulty:settings.difficulty; startGame(d,false); $("intro-text").textContent=INTRO_TEXT; G.state="playing"; showScreen(null); beginPlay(); });
  on("btn-det-retry",()=>{ Sound.click(); startGame(G?G.difficulty:settings.difficulty,false); $("intro-text").textContent=INTRO_TEXT; beginPlay(); });
  on("btn-over-quit",()=>{ Sound.click(); quitToTitle(); });
  on("btn-det-quit",()=>{ Sound.click(); quitToTitle(); });
  on("btn-win-title",()=>{ Sound.click(); quitToTitle(); });
  on("btn-win-ng",()=>{
    Sound.click();
    const d=G?G.difficulty:settings.difficulty;
    startGame(d,true);
    $("intro-text").textContent="NIGHT 2.\n\nSame building. Same endless afternoon. He is faster, Patty has a new folder, and you know where every tape is supposed to be — in theory.\n\nFind all five tapes this time. Ring the bell. Get out. Learn what actually happened here.";
  });
  on("hud-pause",()=>{ if(G&&G.state==="playing") pauseGame(); });

  /* settings inputs */
  const rng=(id,key,div)=>{
    const el=$(id); if(!el) return;
    el.addEventListener("input",()=>{ settings[key]=el.value/div; applySettings(); });
  };
  rng("range-master","master",100); rng("range-music","music",100); rng("range-sfx","sfx",100); rng("range-sens","sens",100);
  const sel=(id,key,after)=>{
    const el=$(id); if(!el) return;
    el.addEventListener("change",()=>{ settings[key]=el.value; applySettings(); if(after) after(); });
  };
  sel("sel-difficulty","difficulty");
  sel("sel-res","res",()=>{ settings.resSet=true; persistSettings(); });
  const cb=(id,key)=>{
    const el=$(id); if(!el) return;
    el.addEventListener("change",()=>{ settings[key]=el.checked; applySettings(); });
  };
  cb("chk-crt","crt"); cb("chk-shake","shake"); cb("chk-dither","dither");

  window.addEventListener("resize",()=>{ if(cv) resize(); });
  window.addEventListener("orientationchange",()=>{ setTimeout(()=>{ if(cv) resize(); },250); });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden&&G&&G.state==="playing") pauseGame();
  });
  /* first gesture unlocks WebAudio on mobile */
  const unlock=()=>{ Sound.init(); Sound.setVolumes(settings.master,settings.music,settings.sfx);
    window.removeEventListener("pointerdown",unlock); window.removeEventListener("keydown",unlock); };
  window.addEventListener("pointerdown",unlock); window.addEventListener("keydown",unlock);
}

/* ============================== boot ============================== */
function boot(){
  cv=$("game");
  if(!cv||!cv.getContext) return;
  ctx=cv.getContext("2d",{alpha:false});
  registerTextures();
  buildMap("school");
  Level.build();
  resize();
  applyLook();
  attractMode();
  bindUI();
  initMouse();
  initTouch();
  syncSettingsUI();
  refreshTitle();
  $("intro-text").textContent=INTRO_TEXT;
  $("how-text").textContent=HOW_TEXT;
  bootOk=true;
  Sound.setVolumes(settings.master,settings.music,settings.sfx);
  requestAnimationFrame(loop);
  showScreen("screen-title");
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();

/* ============================== headless test hooks ============================== */
window.__game={
  get G(){ return G; }, set G(v){ G=v; },
  get grid(){ return grid; }, get doors(){ return doors; }, get props(){ return props; },
  get decor(){ return decor; }, get hotspots(){ return hotspots; },
  get settings(){ return settings; }, get keys(){ return keys; },
  get bootOk(){ return bootOk; }, set bootOk(v){ bootOk=v; },
  T, EYE, WALL_H, REACH, VIEW_TILES, WALK_SPEED, RUN_SPEED, MW, MH, TW, TH,
  DIFF, PERIODS, FINAL_PERIOD, PA_LINES, PAGES, TAPES, LORE, LORE_TITLE, POSTERS,
  PAGE_SPOTS, TAPE_SPOTS, SODA_SPOTS, PASS_SPOTS, MOP_CLEAN, MOP_SEE, PATTY_SPOT, PATTY_SLIP, PATTY_OK,
  RES, Level, TEX_SHADOW:()=>TEX_SHADOW, camRef:()=>camRef,
  buildMap, tileAt, mapW, mapH, isSolidTile, isWalkable, snapWalk, faceYaw, dist, clamp, rand, choice,
  losBlocked, findPath, collides, makePickups, buildHotspots, posterKey,
  newGameState, applySave, loadSave, persistSave, clearSave, flag, setFlag,
  startGame, beginPlay, pauseGame, resumeGame, caught, detention, winGame, quitToTitle,
  updatePlayer, updateMop, updatePatty, updateSchedule, updateMood, updateObjective, updateHUD,
  stepWorld, stepScare, stepAttract, emitNoise, spawnParticles,
  lookTarget, doInteract, interactLore, openDoor, enterLocker, exitLocker, openSecret,
  collectPickup, onPageCollected, useSoda, throwPass, makeMess, showPass, giveSlip,
  tryExit, tryTower, enterTower, leaveTower, ringBell, mopTeleportScare,
  moveAlongPath, inFront, drawWorld, makeCam, scareCam, attractCam, propFilter,
  resize, registerTextures, applyLook, boot, attractMode, toast, openReader, closeReader,
  showScreen, refreshTitle, syncSettingsUI, applySettings
};
})();
