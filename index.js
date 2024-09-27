// Existing variable declarations
const spriteForm = document.getElementById("spriteForm");
const spriteList = document.getElementById("spriteList");
const errorMsg = document.getElementById("errorMsg");
const textContainer = document.getElementById("textContainer");
const textAreaInner = document.getElementById("textAreaInner");
const blocksContainer = document.getElementById("blocksContainer");
const blockSize = document.getElementById("blockSize");
const svgImg = document.getElementById("svgImage");
const canvas = document.getElementById("imageCanvas");
let sb3File = {};
let projectData = {};
let scratchblocksCode = "";
let viewer = {};
const HAT_BLOCKS = [
  "event_whenflagclicked",
  "event_whenkeypressed",
  "event_whengreaterthan",
  "event_whenthisspriteclicked",
  "event_whenstageclicked",
  "event_whenbackdropswitchesto",
  "event_whenbroadcastreceived",
  "control_start_as_clone",
  "procedures_definition",
  "boost_whenColor",
  "boost_whenTilted",
  "ev3_whenButtonPressed",
  "ev3_whenDistanceLessThan",
  "ev3_whenBrightnessLessThan",
  "gdxfor_whenGesture",
  "gdxfor_whenForcePushedOrPulled",
  "gdxfor_whenTilted",
  "makeymakey_whenMakeyKeyPressed",
  "makeymakey_whenCodePressed",
  "microbit_whenButtonPressed",
  "microbit_whenGesture",
  "microbit_whenTilted",
  "microbit_whenPinConnected",
  "wedo2_whenDistance",
  "wedo2_whenTilted",
];

// Event listeners
document.getElementById("sb3Upload").addEventListener("change", (e) => {
  e.preventDefault();
  textContainer.hidden = true;
  blocksContainer.hidden = true;
  errorMsg.hidden = true;
  sb3File = e.target.files[0];
  parseSb3File(sb3File).then((projectJson) => {
    loadProject(JSON.parse(projectJson));
  });
});

spriteList.addEventListener("change", generateScratchblocks);
spriteList.addEventListener("click", generateScratchblocks);
blockSize.addEventListener("change", () => {
  renderSvg().then(renderPNG());
});

new ClipboardJS("#copyText");

document
  .getElementById("downloadText")
  .addEventListener("click", generateTxtFileDownload);
document
  .getElementById("downloadSvg")
  .addEventListener("click", generateSvgFileDownload);
document.getElementById("generatePng").addEventListener("click", renderPNG);
document
  .getElementById("downloadPng")
  .addEventListener("click", generatePngFileDownload);

// Existing functions remain unchanged
async function parseSb3File(file) {
  zip = await JSZip.loadAsync(file);
  project = await zip.file("project.json").async("text");
  return project;
}

async function loadProject(projJSON) {
  projectData = projJSON;
  spriteForm.hidden = false;
  Array.from(spriteList.children)
    .filter((e) => e.value !== "_stage_")
    .forEach((elem) => {
      spriteList.removeChild(elem);
    });
  projectData.targets
    .filter((t) => !t.isStage)
    .forEach((target) => {
      const option = document.createElement("option");
      option.value = target.name;
      option.innerText = target.name;
      spriteList.appendChild(option);
    });
}

function hideContainers(toHide) {
  textContainer.hidden = blocksContainer.hidden = toHide;
  errorMsg.hidden = !toHide;
}

function generateScratchblocks() {
  if (!projectData || Object.keys(projectData).length === 0) {
    errorMsg.textContent = "Project data is empty/invalid.";
    hideContainers(true);
    return;
  } else {
    const spriteName = spriteList.value;
    let target = projectData.targets.find((t) =>
      spriteName === "_stage_" ? t.isStage : t.name === spriteName
    );
    if (!target) {
      target = projectData.find((t) => t.isStage);
    }
    if (Object.keys(target.blocks).length == 0) {
      errorMsg.textContent = "No blocks found.";
      hideContainers(true);
      return;
    } else {
      hideContainers(false);
      const hatBlocks = Object.keys(target.blocks).filter((key) => {
        const blockItem = target.blocks[key];
        return (
          // Modified condition to include hat blocks even if they don't have a 'next' block
          blockItem.topLevel && HAT_BLOCKS.includes(blockItem.opcode)
        );
      });
      scratchblocksCode = hatBlocks
        .map((hatKey) =>
          parseSB3Blocks.toScratchblocks(hatKey, target.blocks, "en", {
            tab: " ".repeat(4),
            variableStyle: "as-needed",
          })
        )
        .join("\n\n");

      textAreaInner.textContent = scratchblocksCode;
      renderSvg().then(renderPNG());

      // New code for generating and rendering flowcharts
      generateAndRenderFlowcharts(hatBlocks, target.blocks);

      console.log("target.blocks", target.blocks);
    }
  }
}

async function renderSvg() {
  const renderOpts = {
    style: "scratch3",
    languages: ["en"],
    scale: blockSize.value,
  };
  viewer = scratchblocks.newView(
    scratchblocks.parse(scratchblocksCode, renderOpts),
    renderOpts
  );
  await viewer.render();
  const svgStr = viewer.exportSVGString();
  svgImg.src =
    "data:image/svg+xml;utf8," + svgStr.replace(/[#]/g, encodeURIComponent);
}

async function renderPNG() {
  canvas.width = viewer.width * blockSize.value;
  canvas.height = viewer.height * blockSize.value;
  const context = await canvas.getContext("2d");
  await context.save();
  await context.drawImage(svgImg, 0, 0);
  const imgURL = await canvas.toDataURL("image/png");
  return imgURL;
}

function generateTxtFileDownload() {
  const fileName =
    sb3File.name.slice(0, -4) +
    "_" +
    spriteList.value.replace("_", "") +
    ".txt";
  const blob = new Blob([scratchblocksCode], { type: "text/plain" });
  const objectURL = URL.createObjectURL(blob);
  triggerDownload(objectURL, fileName, "text/plain");
}

function generateSvgFileDownload() {
  const fileName =
    sb3File.name.slice(0, -4) +
    "_" +
    spriteList.value.replace("_", "") +
    ".svg";
  triggerDownload(svgImg.src, fileName, "image/svg+xml");
}

function generatePngFileDownload() {
  const fileName =
    sb3File.name.slice(0, -4) +
    "_" +
    spriteList.value.replace("_", "") +
    ".png";
  renderPNG().then((imgURL) => {
    triggerDownload(imgURL, fileName, "image/png");
  });
}

function triggerDownload(objectURL, fileName, mimeType) {
  const downloadLink = document.createElement("a");
  downloadLink.href = objectURL;
  downloadLink.download = fileName;
  downloadLink.type = mimeType;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(objectURL);
}

/* -------------------- */
/* Flowchart Feature Code */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */
/* -------------------- */

// Initialize JointJS graph and paper
const graph = new joint.dia.Graph();
const paper = new joint.dia.Paper({
  el: document.getElementById("flowchartContainer"),
  model: graph,
  width: "100%",
  height: "600px",
  gridSize: 10,
  drawGrid: true,
  background: {
    color: "rgba(0, 255, 0, 0.1)",
  },
});

// Define custom shapes for different block types
const FlowchartStart = joint.dia.Element.define("flowchart.Start", {
  attrs: {
    body: {
      refD: "M 0 10 A 10 10 0 0 1 10 0 H 50 A 10 10 0 0 1 60 10 V 30 A 10 10 0 0 1 50 40 H 10 A 10 10 0 0 1 0 30 Z",
      fill: "#2ECC71",
      stroke: "#27AE60",
      strokeWidth: 2,
    },
    label: {
      textVerticalAnchor: "middle",
      textAnchor: "middle",
      refX: "50%",
      refY: "50%",
      fontSize: 12,
      fill: "black",
    },
  },
});

const FlowchartEnd = joint.dia.Element.define("flowchart.End", {
  attrs: {
    body: {
      refD: "M 0 10 A 10 10 0 0 1 10 0 H 50 A 10 10 0 0 1 60 10 V 30 A 10 10 0 0 1 50 40 H 10 A 10 10 0 0 1 0 30 Z",
      fill: "#E74C3C",
      stroke: "#C0392B",
      strokeWidth: 2,
    },
    label: {
      textVerticalAnchor: "middle",
      textAnchor: "middle",
      refX: "50%",
      refY: "50%",
      fontSize: 12,
      fill: "black",
    },
  },
});

const FlowchartProcess = joint.dia.Element.define("flowchart.Process", {
  attrs: {
    body: {
      refWidth: "100%",
      refHeight: "100%",
      fill: "#3498DB",
      stroke: "#2980B9",
      strokeWidth: 2,
      rx: 5,
      ry: 5,
    },
    label: {
      textVerticalAnchor: "middle",
      textAnchor: "middle",
      refX: "50%",
      refY: "50%",
      fontSize: 12,
      fill: "black",
    },
  },
});

const FlowchartDecision = joint.dia.Element.define("flowchart.Decision", {
  attrs: {
    body: {
      refPoints: "0,10 50,0 100,10 50,20",
      fill: "#F1C40F",
      stroke: "#F39C12",
      strokeWidth: 2,
    },
    label: {
      textVerticalAnchor: "middle",
      textAnchor: "middle",
      refX: "50%",
      refY: "50%",
      fontSize: 12,
      fill: "black",
    },
  },
});

const FlowchartTerminator = joint.dia.Element.define("flowchart.Terminator", {
  attrs: {
    body: {
      refD: "M 10 0 H 90 A 10 10 0 0 1 100 10 V 30 A 10 10 0 0 1 90 40 H 10 A 10 10 0 0 1 0 30 V 10 A 10 10 0 0 1 10 0 Z",
      fill: "#FFCC00",
      stroke: "#FF9900",
      strokeWidth: 2,
    },
    label: {
      textVerticalAnchor: "middle",
      textAnchor: "middle",
      refX: "50%",
      refY: "50%",
      fontSize: 12,
      fill: "black",
    },
  },
});

// Refactored traversal logic
function traverseBlocks(blockId, blocks, visitedBlocks = new Set()) {
  if (visitedBlocks.has(blockId)) return null;
  visitedBlocks.add(blockId);

  const block = blocks[blockId];
  if (!block) return null;

  const nodeData = createNodeData(block, blocks);
  const connections = [];

  switch (block.opcode) {
    case "control_if":
    case "control_if_else":
      processConditionalBlock(
        block,
        blocks,
        nodeData,
        connections,
        visitedBlocks
      );
      break;
    case "control_repeat":
    case "control_repeat_until":
      processLoopBlock(block, blocks, nodeData, connections, visitedBlocks);
      break;
    case "control_forever":
      processForeverBlock(block, blocks, nodeData, connections, visitedBlocks);
      break;
    default:
      processDefaultBlock(block, blocks, nodeData, connections, visitedBlocks);
  }

  return { nodeData, connections };
}

function createNodeData(block, blocks) {
  return {
    id: block.id,
    type: getBlockType(block),
    label: getBlockLabel(block, blocks),
  };
}

function processConditionalBlock(
  block,
  blocks,
  nodeData,
  connections,
  visitedBlocks
) {
  const conditionData = getConditionData(block, blocks);
  nodeData.condition = conditionData;

  if (block.inputs.SUBSTACK) {
    const substack = traverseBlocks(
      block.inputs.SUBSTACK[1],
      blocks,
      visitedBlocks
    );
    if (substack) {
      connections.push({
        from: block.id,
        to: substack.nodeData.id,
        condition: "yes",
      });
      connections.push(...substack.connections);
    }
  }

  if (block.opcode === "control_if_else" && block.inputs.SUBSTACK2) {
    const substack2 = traverseBlocks(
      block.inputs.SUBSTACK2[1],
      blocks,
      visitedBlocks
    );
    if (substack2) {
      connections.push({
        from: block.id,
        to: substack2.nodeData.id,
        condition: "no",
      });
      connections.push(...substack2.connections);
    }
  }

  if (block.next) {
    const nextBlock = traverseBlocks(block.next, blocks, visitedBlocks);
    if (nextBlock) {
      connections.push({ from: block.id, to: nextBlock.nodeData.id });
      connections.push(...nextBlock.connections);
    }
  }
}

function processLoopBlock(block, blocks, nodeData, connections, visitedBlocks) {
  if (block.inputs.SUBSTACK) {
    const substack = traverseBlocks(
      block.inputs.SUBSTACK[1],
      blocks,
      visitedBlocks
    );
    if (substack) {
      connections.push({
        from: block.id,
        to: substack.nodeData.id,
        condition: "repeat",
      });
      connections.push(...substack.connections);

      // Find the last block in the substack
      let lastBlockId = substack.nodeData.id;
      while (blocks[lastBlockId].next) {
        lastBlockId = blocks[lastBlockId].next;
      }

      // Connect the last block back to the loop block
      connections.push({ from: lastBlockId, to: block.id, condition: "loop" });
    }
  }

  if (block.next) {
    const nextBlock = traverseBlocks(block.next, blocks, visitedBlocks);
    if (nextBlock) {
      connections.push({ from: block.id, to: nextBlock.nodeData.id });
      connections.push(...nextBlock.connections);
    }
  }
}

function processForeverBlock(
  block,
  blocks,
  nodeData,
  connections,
  visitedBlocks
) {
  if (block.inputs.SUBSTACK) {
    const substack = traverseBlocks(
      block.inputs.SUBSTACK[1],
      blocks,
      visitedBlocks
    );
    if (substack) {
      // Connect the forever block to the first block in its substack
      connections.push({
        from: block.id,
        to: substack.nodeData.id,
        condition: "forever",
      });
      connections.push(...substack.connections);

      // Find the last block in the substack
      let lastBlockId = substack.nodeData.id;
      while (blocks[lastBlockId].next) {
        lastBlockId = blocks[lastBlockId].next;
      }

      // Connect the last block back to the first block in the substack
      connections.push({
        from: lastBlockId,
        to: substack.nodeData.id,
        condition: "loop",
      });
    }
  }

  // The forever block itself doesn't have a node representation
  nodeData.type = "invisible";
  nodeData.label = "Forever"; // This won't be visible but helps with debugging
}

function processDefaultBlock(
  block,
  blocks,
  nodeData,
  connections,
  visitedBlocks
) {
  if (block.next) {
    const nextBlock = traverseBlocks(block.next, blocks, visitedBlocks);
    if (nextBlock) {
      connections.push({ from: block.id, to: nextBlock.nodeData.id });
      connections.push(...nextBlock.connections);
    }
  }
}

// Helper functions
function getBlockType(block) {
  if (HAT_BLOCKS.includes(block.opcode)) return "start";
  if (block.opcode === "control_stop") return "end";
  if (
    [
      "control_if",
      "control_if_else",
      "control_repeat",
      "control_repeat_until",
    ].includes(block.opcode)
  )
    return "decision";
  return "process";
}

// Helper functions
function getBlockLabel(block, blocks) {
  switch (block.opcode) {
    // Event blocks (HAT_BLOCKS)
    case "event_whenflagclicked":
      return "When the green flag is clicked";
    case "event_whenkeypressed":
      return `When "${getFieldValue(block, "KEY_OPTION")}" key is pressed`;
    case "event_whenthisspriteclicked":
      return "When this sprite is clicked";
    case "event_whenbackdropswitchesto":
      return `When backdrop switches to "${getInputValue(
        block,
        "BACKDROP",
        blocks
      )}"`;
    case "event_whenbroadcastreceived":
      return `When I receive "${getFieldValue(block, "BROADCAST_OPTION")}"`;
    case "event_broadcast":
      return `Broadcast "${getInputValue(block, "BROADCAST_INPUT", blocks)}"`;
    case "event_broadcastandwait":
      return `Broadcast "${getInputValue(
        block,
        "BROADCAST_INPUT",
        blocks
      )}" and wait`;
    case "event_whengreaterthan":
      return `When sensor value > ${getInputValue(block, "VALUE", blocks)}`;

    // Control blocks
    case "control_wait":
      return `Wait ${getInputValue(block, "DURATION", blocks)} seconds`;
    case "control_stop":
      return `Stop "${getFieldValue(block, "STOP_OPTION")}"`;
    case "control_if":
      return `If (${getInputValue(block, "CONDITION", blocks) || "condition"})`;
    case "control_if_else":
      return `If (${getInputValue(block, "CONDITION", blocks) || "condition"})`;
    case "control_repeat":
      return `Has repeated ${
        getInputValue(block, "TIMES", blocks) || "?"
      } times?`;
    case "control_repeat_until":
      return `Has repeated until (${
        getInputValue(block, "CONDITION", blocks) || "condition"
      })?`;
    case "control_wait_until":
      return `Has waited until (${
        getInputValue(block, "CONDITION", blocks) || "condition"
      })?`;
    case "control_for_each":
      return `For each ${getFieldValue(block, "VARIABLE")} in ${getInputValue(
        block,
        "VALUE",
        blocks
      )}`;

    // Motion blocks
    case "motion_movesteps":
      return `Move ${getInputValue(block, "STEPS", blocks)} steps`;
    case "motion_turnright":
      return `Turn ${getInputValue(
        block,
        "DEGREES",
        blocks
      )} degrees to the right`;
    case "motion_turnleft":
      return `Turn ${getInputValue(
        block,
        "DEGREES",
        blocks
      )} degrees to the left`;
    case "motion_gotoxy":
      return `Go to x: ${getInputValue(block, "X", blocks)}, y: ${getInputValue(
        block,
        "Y",
        blocks
      )}`;
    case "motion_goto":
      return `Go to ${getInputValue(block, "TO", blocks)}`;
    case "motion_glideto":
      return `Glide ${getInputValue(
        block,
        "SECS",
        blocks
      )} secs to ${getInputValue(block, "TO", blocks)}`;
    case "motion_glidesecstoxy":
      return `Glide ${getInputValue(
        block,
        "SECS",
        blocks
      )} secs to x: ${getInputValue(block, "X", blocks)}, y: ${getInputValue(
        block,
        "Y",
        blocks
      )}`;
    case "motion_pointindirection":
      return `Point in direction ${getInputValue(block, "DIRECTION", blocks)}`;
    case "motion_pointtowards":
      return `Point towards ${getInputValue(block, "TOWARDS", blocks)}`;
    case "motion_ifonedgebounce":
      return "If on edge, bounce";
    case "motion_setrotationstyle":
      return `Set rotation style "${getFieldValue(block, "STYLE")}"`;
    case "motion_setx":
      return `Set x to ${getInputValue(block, "X", blocks)}`;
    case "motion_sety":
      return `Set y to ${getInputValue(block, "Y", blocks)}`;

    // Looks blocks
    case "looks_say":
      return `Say "${getInputValue(block, "MESSAGE", blocks)}"`;
    case "looks_sayforsecs":
      return `Say "${getInputValue(
        block,
        "MESSAGE",
        blocks
      )}" for ${getInputValue(block, "SECS", blocks)} seconds`;
    case "looks_think":
      return `Think "${getInputValue(block, "MESSAGE", blocks)}"`;
    case "looks_thinkforsecs":
      return `Think "${getInputValue(
        block,
        "MESSAGE",
        blocks
      )}" for ${getInputValue(block, "SECS", blocks)} seconds`;
    case "looks_switchcostumeto":
      return `Switch costume to "${getInputValue(block, "COSTUME", blocks)}"`;
    case "looks_nextcostume":
      return "Switch to next costume";
    case "looks_switchbackdropto":
      return `Switch backdrop to "${getInputValue(block, "BACKDROP", blocks)}"`;
    case "looks_nextbackdrop":
      return "Switch to next backdrop";
    case "looks_changeeffectby":
      return `Change "${getFieldValue(
        block,
        "EFFECT"
      )}" effect by ${getInputValue(block, "CHANGE", blocks)}`;
    case "looks_seteffectto":
      return `Set "${getFieldValue(block, "EFFECT")}" effect to ${getInputValue(
        block,
        "VALUE",
        blocks
      )}`;
    case "looks_cleargraphiceffects":
      return "Clear graphic effects";
    case "looks_show":
      return "Show";
    case "looks_hide":
      return "Hide";
    case "looks_changesizeby":
      return `Change size by ${getInputValue(block, "CHANGE", blocks)}`;
    case "looks_goforwardbackwardlayers":
      return `Go ${getFieldValue(block, "FORWARD_BACKWARD")} ${getInputValue(
        block,
        "NUM",
        blocks
      )} layer(s)`;

    case "looks_gotofrontback":
      return `Go to ${getFieldValue(block, "FRONT_BACK")} layer`;

    // Sound blocks
    case "sound_play":
      return `Start sound "${getFieldValue(block, "SOUND_MENU")}"`;
    case "sound_playuntildone":
      return `Play sound "${getFieldValue(block, "SOUND_MENU")}" until done`;
    case "sound_stopallsounds":
      return "Stop all sounds";
    case "sound_changeeffectby":
      return `Change sound effect "${getFieldValue(
        block,
        "EFFECT"
      )}" by ${getInputValue(block, "VALUE", blocks)}`;
    case "sound_seteffectto":
      return `Set sound effect "${getFieldValue(
        block,
        "EFFECT"
      )}" to ${getInputValue(block, "VALUE", blocks)}`;
    case "sound_cleareffects":
      return "Clear sound effects";
    case "sound_changevolumeby":
      return `Change volume by ${getInputValue(block, "VOLUME", blocks)}`;
    case "sound_setvolumeto":
      return `Set volume to ${getInputValue(block, "VOLUME", blocks)}%`;

    // Sensing blocks
    case "sensing_touchingobject":
      return `Touching "${getInputValue(
        block,
        "TOUCHINGOBJECTMENU",
        blocks
      )}"?`;
    case "sensing_touchingcolor":
      return `Touching color ${getInputValue(block, "COLOR", blocks)}?`;
    case "sensing_coloristouchingcolor":
      return `Color ${getInputValue(
        block,
        "COLOR",
        blocks
      )} is touching ${getInputValue(block, "COLOR2", blocks)}?`;
    case "sensing_distanceto":
      return `Distance to "${getInputValue(block, "DISTANCETOMENU", blocks)}"`;
    case "sensing_askandwait":
      return `Ask "${getInputValue(block, "QUESTION", blocks)}" and wait`;
    case "sensing_answer":
      return "Answer";
    case "sensing_keypressed":
      return `Key "${getInputValue(block, "KEY_OPTION", blocks)}" pressed?`;
    case "sensing_mousedown":
      return "Mouse down?";
    case "sensing_mousex":
      return "Mouse X position";
    case "sensing_mousey":
      return "Mouse Y position";
    case "sensing_loudness":
      return "Loudness";
    case "sensing_timer":
      return "Timer";
    case "sensing_resettimer":
      return "Reset timer";

    // Data blocks
    case "data_setvariableto":
      return `Set "${getFieldValue(block, "VARIABLE")}" to ${getInputValue(
        block,
        "VALUE",
        blocks
      )}`;
    case "data_changevariableby":
      return `Change "${getFieldValue(block, "VARIABLE")}" by ${getInputValue(
        block,
        "VALUE",
        blocks
      )}`;
    case "data_showvariable":
      return `Show variable "${getFieldValue(block, "VARIABLE")}"`;
    case "data_hidevariable":
      return `Hide variable "${getFieldValue(block, "VARIABLE")}"`;
    case "data_addtolist":
      return `Add ${getInputValue(block, "ITEM", blocks)} to "${getFieldValue(
        block,
        "LIST"
      )}"`;
    case "data_deleteoflist":
      return `Delete ${getInputValue(
        block,
        "INDEX",
        blocks
      )} of "${getFieldValue(block, "LIST")}"`;
    case "data_insertatlist":
      return `Insert ${getInputValue(block, "ITEM", blocks)} at ${getInputValue(
        block,
        "INDEX",
        blocks
      )} of "${getFieldValue(block, "LIST")}"`;
    case "data_replaceitemoflist":
      return `Replace item ${getInputValue(
        block,
        "INDEX",
        blocks
      )} of "${getFieldValue(block, "LIST")}" with ${getInputValue(
        block,
        "ITEM",
        blocks
      )}`;
    case "data_itemoflist":
      return `Item ${getInputValue(block, "INDEX", blocks)} of "${getFieldValue(
        block,
        "LIST"
      )}"`;
    case "data_lengthoflist":
      return `Length of "${getFieldValue(block, "LIST")}"`;
    case "data_showlist":
      return `Show list "${getFieldValue(block, "LIST")}"`;
    case "data_hidelist":
      return `Hide list "${getFieldValue(block, "LIST")}"`;

    // Operator blocks
    case "operator_add":
      return `${getInputValue(block, "NUM1", blocks)} + ${getInputValue(
        block,
        "NUM2",
        blocks
      )}`;
    case "operator_subtract":
      return `${getInputValue(block, "NUM1", blocks)} - ${getInputValue(
        block,
        "NUM2",
        blocks
      )}`;
    case "operator_multiply":
      return `${getInputValue(block, "NUM1", blocks)} × ${getInputValue(
        block,
        "NUM2",
        blocks
      )}`;
    case "operator_divide":
      return `${getInputValue(block, "NUM1", blocks)} ÷ ${getInputValue(
        block,
        "NUM2",
        blocks
      )}`;
    case "operator_random":
      return `Pick random ${getInputValue(
        block,
        "FROM",
        blocks
      )} to ${getInputValue(block, "TO", blocks)}`;
    case "operator_equals":
      return `${getInputValue(block, "OPERAND1", blocks)} = ${getInputValue(
        block,
        "OPERAND2",
        blocks
      )}`;
    case "operator_gt":
      return `${getInputValue(block, "OPERAND1", blocks)} > ${getInputValue(
        block,
        "OPERAND2",
        blocks
      )}`;
    case "operator_lt":
      return `${getInputValue(block, "OPERAND1", blocks)} < ${getInputValue(
        block,
        "OPERAND2",
        blocks
      )}`;
    case "operator_and":
      return `(${getInputValue(
        block,
        "OPERAND1",
        blocks
      )}) and (${getInputValue(block, "OPERAND2", blocks)})`;
    case "operator_or":
      return `(${getInputValue(block, "OPERAND1", blocks)}) or (${getInputValue(
        block,
        "OPERAND2",
        blocks
      )})`;
    case "operator_not":
      return `Not (${getInputValue(block, "OPERAND", blocks)})`;
    case "operator_join":
      return `Join "${getInputValue(
        block,
        "STRING1",
        blocks
      )}" and "${getInputValue(block, "STRING2", blocks)}"`;
    case "operator_letter_of":
      return `Letter ${getInputValue(
        block,
        "LETTER",
        blocks
      )} of "${getInputValue(block, "STRING", blocks)}"`;
    case "operator_length":
      return `Length of "${getInputValue(block, "STRING", blocks)}"`;
    case "operator_contains":
      return `Does "${getInputValue(
        block,
        "STRING1",
        blocks
      )}" contain "${getInputValue(block, "STRING2", blocks)}"?`;

    // Procedures (Custom blocks)
    case "procedures_definition":
      return `Define custom block "${getProcedureName(block)}"`;
    case "procedures_call":
      return `Call custom block "${getProcedureName(block)}"`;

    // Default case
    default:
      // Check if the block has a mutation with a proccode (custom procedure)
      if (block.mutation && block.mutation.proccode) {
        return `Custom block: "${block.mutation.proccode}"`;
      }
      // Convert opcode to a more readable format
      return formatOpcode(block.opcode);
  }
}

// Helper function to format opcodes into readable labels
function formatOpcode(opcode) {
  // Replace underscores with spaces
  let label = opcode.replace(/_/g, " ");
  // Remove any leading category names (e.g., "motion_", "control_")
  label = label.replace(/^[a-z]+ /, "");
  // Capitalize first letter of each word
  label = label.replace(/\b\w/g, (char) => char.toUpperCase());
  return label;
}

function mapMenuValue(menuName, value) {
  const mappings = {
    // General mappings
    _random_: "random position",
    _mouse_: "mouse-pointer",
    // Key options
    space: "space",
    "left arrow": "left arrow",
    "right arrow": "right arrow",
    "up arrow": "up arrow",
    "down arrow": "down arrow",
    // Front/Back options
    front: "front",
    back: "back",
    // Forward/Backward options
    forward: "forward",
    backward: "backward",
    // Add more mappings as necessary
  };
  return mappings[value] || value;
}

function getBlockType(block) {
  if (HAT_BLOCKS.includes(block.opcode) || block.opcode === "control_stop") {
    return "terminator";
  } else if (
    [
      "control_if",
      "control_if_else",
      "control_repeat",
      "control_repeat_until",
    ].includes(block.opcode)
  ) {
    return "decision";
  } else if (block.opcode === "control_forever") {
    return "process"; // or 'operation', depending on flowchart.js support
  } else if (
    [
      "event_whenkeypressed",
      "event_whenthisspriteclicked",
      "looks_say",
      "looks_sayforsecs",
      "looks_think",
      "looks_thinkforsecs",
      "sound_play",
      "sound_playuntildone",
    ].includes(block.opcode)
  ) {
    return "inputoutput";
  } else {
    return "process";
  }
}

function getConditionData(block, blocks) {
  if (block.inputs && block.inputs.CONDITION) {
    let conditionBlockId = block.inputs.CONDITION[1];
    let conditionBlock = blocks[conditionBlockId];
    if (conditionBlock) {
      return getBlockLabel(conditionBlock, blocks);
    }
  }
  return "condition";
}

function getInputValue(block, inputName, blocks) {
  if (block.inputs && block.inputs[inputName]) {
    const input = block.inputs[inputName];
    const inputType = input[0];
    const inputValue = input[1];

    if (Array.isArray(inputValue)) {
      // Input is a literal value
      console.log("label_l", inputValue);

      return inputValue[1];
    } else if (typeof inputValue === "string") {
      // Input is a block ID reference
      const referencedBlockId = inputValue;
      const referencedBlock = blocks[referencedBlockId];
      console.log("label_r", referencedBlock);
      if (referencedBlock) {
        if (
          referencedBlock.fields &&
          Object.keys(referencedBlock.fields).length > 0
        ) {
          // The block has fields (e.g., a menu or variable)
          for (const fieldName in referencedBlock.fields) {
            const value = getFieldValue(referencedBlock, fieldName);
            return mapMenuValue(fieldName, value);
          }
        } else {
          console.log("label_woo");

          // The block may have inputs (nested blocks) or be an operator/reporter
          return getBlockLabel(referencedBlock, blocks);
        }
      }
    }
  }
  return "";
}

function getFieldValue(block, fieldName) {
  if (block.fields && block.fields[fieldName]) {
    return block.fields[fieldName][0];
  }
  return "";
}

function getProcedureName(block) {
  if (block.mutation && block.mutation.proccode) {
    return block.mutation.proccode;
  }
  return "Custom Block";
}

// Main function to generate flowchart data
function generateFlowchartData(blocks) {
  const hatBlocks = Object.keys(blocks).filter((key) =>
    HAT_BLOCKS.includes(blocks[key].opcode)
  );
  const flowchartData = [];

  for (const hatBlockId of hatBlocks) {
    const result = traverseBlocks(hatBlockId, blocks);
    if (result) {
      flowchartData.push(result);
    }
  }

  return flowchartData;
}

// Function to render flowchart using JointJS
function renderFlowchart(flowchartData) {
  console.log("Flowchart data:", flowchartData);

  // Clear existing graph
  graph.clear();

  const elements = [];
  const links = [];

  // Create JointJS elements and links based on flowchartData
  for (const { nodeData, connections } of flowchartData) {
    const element = createJointJSElements(nodeData);
    if (element) {
      elements.push(element);
    }
    links.push(...createJointJSLinks(connections));
  }

  console.log("Created elements:", elements);
  console.log("Created links:", links);

  // Add elements and links to the graph
  try {
    graph.addCells([...elements, ...links]);
  } catch (error) {
    console.error("Error adding cells to graph:", error);
    console.error("Problematic elements or links:", [...elements, ...links]);
  }

  // Apply layout
  applyLayout();
}

// Helper functions to create JointJS elements and links
function createJointJSElements(nodeData) {
  if (!nodeData || typeof nodeData !== "object") {
    console.error("Invalid nodeData:", nodeData);
    return null;
  }

  let element;
  const commonAttrs = {
    body: {
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
    },
    label: {
      text: nodeData.label || "",
      fill: "#000000",
      fontSize: 12,
    },
  };

  switch (nodeData.type) {
    case "start":
    case "terminator":
      element = new joint.shapes.standard.Circle({
        size: { width: 100, height: 60 },
        attrs: {
          ...commonAttrs,
          body: {
            ...commonAttrs.body,
            fill: "#FFCC00",
          },
        },
      });
      break;
    case "end":
      element = new joint.shapes.standard.Circle({
        size: { width: 100, height: 60 },
        attrs: {
          ...commonAttrs,
          body: {
            ...commonAttrs.body,
            fill: "#FF9999",
          },
        },
      });
      break;
    case "decision":
      element = new joint.shapes.standard.Diamond({
        size: { width: 120, height: 80 },
        attrs: {
          ...commonAttrs,
          body: {
            ...commonAttrs.body,
            fill: "#CCFFCC",
          },
        },
      });
      break;
    case "process":
      element = new joint.shapes.standard.Rectangle({
        size: { width: 120, height: 60 },
        attrs: commonAttrs,
      });
      break;
    case "invisible":
      element = new joint.shapes.standard.Rectangle({
        size: { width: 1, height: 1 },
        attrs: {
          body: { fill: "transparent", stroke: "none" },
          label: { text: "" },
        },
      });
      break;
    default:
      console.error("Unknown node type:", nodeData.type);
      return null;
  }

  element.position(0, 0);
  element.prop("nodeData", nodeData);
  element.attr("label/text", nodeData.label || "");
  element.set("id", nodeData.id);

  return element;
}

function createJointJSLinks(connections) {
  return connections
    .map((conn) => {
      if (!conn.from || !conn.to) {
        console.error("Invalid connection:", conn);
        return null;
      }

      return new joint.shapes.standard.Link({
        source: { id: conn.from },
        target: { id: conn.to },
        router: { name: "manhattan" },
        connector: { name: "rounded" },
        attrs: {
          line: {
            stroke: "#333333",
            "stroke-width": 2,
          },
        },
        labels: [
          {
            position: 0.5,
            attrs: {
              text: {
                text: conn.condition || "",
                fill: "#333333",
                "font-weight": "bold",
              },
              rect: {
                fill: "white",
              },
            },
          },
        ],
      });
    })
    .filter((link) => link !== null);
}

function applyLayout() {
  // if (joint.layout && joint.layout.DirectedGraph) {
  //   try {
  joint.layout.DirectedGraph.layout(graph, {
    setLinkVertices: false,
    rankDir: "TB",
    marginX: 50,
    marginY: 50,
    nodeSep: 80,
    rankSep: 80,
    edgeSep: 50,
    rankSep: 100,
  });
  //   } catch (error) {
  //     console.error("Error applying DirectedGraph layout:", error);
  //     applyCustomLayout(); // Fallback to custom layout
  //   }
  // } else {
  //   console.warn(
  //     "joint.layout.DirectedGraph is not available. Using custom layout."
  //   );
  // applyCustomLayout();
  // }
}

// Custom layout function (as a fallback)
function renderFlowchart(flowchartData) {
  console.log("Flowchart data:", flowchartData);

  // Clear existing graph
  graph.clear();

  const elements = [];
  const links = [];

  // Create JointJS elements and links based on flowchartData
  for (const { nodeData, connections } of flowchartData) {
    const element = createJointJSElements(nodeData);
    if (element) {
      elements.push(element);
    }
    links.push(...createJointJSLinks(connections));
  }

  console.log("Created elements:", elements);
  console.log("Created links:", links);

  // Add elements and links to the graph
  try {
    graph.addCells(elements);
    graph.addCells(links);
  } catch (error) {
    console.error("Error adding cells to graph:", error);
    console.error("Problematic elements:", elements);
    console.error("Problematic links:", links);
  }

  // Apply layout
  applyLayout();
}

// Update the main flow
function generateScratchblocks() {
  // ... (existing code to parse SB3 file)
  if (!projectData || Object.keys(projectData).length === 0) {
    errorMsg.textContent = "Project data is empty/invalid.";
    hideContainers(true);
    return;
  } else {
    const spriteName = spriteList.value;
    let target = projectData.targets.find((t) =>
      spriteName === "_stage_" ? t.isStage : t.name === spriteName
    );
    if (!target) {
      target = projectData.find((t) => t.isStage);
    }
    if (Object.keys(target.blocks).length == 0) {
      errorMsg.textContent = "No blocks found.";
      hideContainers(true);
      return;
    } else {
      hideContainers(false);
      const hatBlocks = Object.keys(target.blocks).filter((key) => {
        const blockItem = target.blocks[key];
        return (
          // Modified condition to include hat blocks even if they don't have a 'next' block
          blockItem.topLevel && HAT_BLOCKS.includes(blockItem.opcode)
        );
      });
      scratchblocksCode = hatBlocks
        .map((hatKey) =>
          parseSB3Blocks.toScratchblocks(hatKey, target.blocks, "en", {
            tab: " ".repeat(4),
            variableStyle: "as-needed",
          })
        )
        .join("\n\n");

      textAreaInner.textContent = scratchblocksCode;
      renderSvg().then(renderPNG());

      try {
        const flowchartData = generateFlowchartData(target.blocks);
        console.log("Generated flowchart data:", flowchartData);
        renderFlowchart(flowchartData);
      } catch (error) {
        console.error("Error in generateScratchblocks:", error);
        // Display error to user
        const errorMessage = document.getElementById("errorMessage");
        if (errorMessage) {
          errorMessage.textContent =
            "An error occurred while generating the flowchart. Please try again or contact support.";
          errorMessage.style.display = "block";
        }
      }
    }
  }
}

// Add zoom and pan functionality
paper.on("blank:pointerdown", (evt, x, y) => {
  const scale = paper.scale();
  let originX = x * scale.sx;
  let originY = y * scale.sy;

  paper.on("blank:pointermove", (evt, x, y) => {
    paper.translate(x - originX / scale.sx, y - originY / scale.sy);
  });

  paper.on("blank:pointerup blank:pointerout", () => {
    paper.off("blank:pointermove");
  });
});

// Add mouse wheel zoom
paper.on("blank:mousewheel", (evt, x, y, delta) => {
  evt.preventDefault();
  const oldScale = paper.scale().sx;
  const newScale = oldScale + delta * 0.1;
  paper.scale(newScale, newScale);
});

// Function to export the flowchart as SVG
function exportAsSVG() {
  const svgDoc = paper.svg;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgDoc);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "flowchart.svg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to export the flowchart as PNG
function exportAsPNG() {
  const svgDoc = paper.svg;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgDoc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "flowchart.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.src =
    "data:image/svg+xml;base64," +
    btoa(unescape(encodeURIComponent(svgString)));
}

// Attach export functions to buttons
document.getElementById("exportSVG").addEventListener("click", exportAsSVG);
document.getElementById("exportPNG").addEventListener("click", exportAsPNG);

// Function to handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const sb3Content = e.target.result;
      parseSb3File(sb3Content).then((projectJson) => {
        const blocks = JSON.parse(projectJson).targets[0].blocks;
        const flowchartData = generateFlowchartData(blocks);
        renderFlowchart(flowchartData);
      });
    };
    reader.readAsArrayBuffer(file);
  }
}

// Attach file upload handler
document
  .getElementById("sb3Upload")
  .addEventListener("change", handleFileUpload);

// Function to parse SB3 file
async function parseSb3File(content) {
  const zip = await JSZip.loadAsync(content);
  const projectJson = await zip.file("project.json").async("text");
  return projectJson;
}

// Add event listener for window resize
window.addEventListener("resize", () => {
  paper.setDimensions(
    document.getElementById("flowchartContainer").offsetWidth,
    600
  );
});

// Function to reset zoom and pan
function resetView() {
  paper.scale(1);
  paper.setOrigin(0, 0);
}

// Attach reset view function to a button
document.getElementById("resetView").addEventListener("click", resetView);

// Function to fit content to view
function fitToContent() {
  paper.scaleContentToFit({ padding: 50 });
}

// Attach fit to content function to a button
document.getElementById("fitContent").addEventListener("click", fitToContent);

// Error handling function
function handleError(error) {
  console.error("An error occurred:", error);
  // Display error message to user
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = "An error occurred: " + error.message;
  errorMessage.style.display = "block";
}

// Wrap main functionality in try-catch for error handling
try {
  // Main execution
  const sb3UploadInput = document.getElementById("sb3Upload");
  if (sb3UploadInput) {
    sb3UploadInput.addEventListener("change", handleFileUpload);
  } else {
    throw new Error("SB3 upload input not found");
  }

  // Initialize paper with error handling
  if (!document.getElementById("flowchartContainer")) {
    throw new Error("Flowchart container not found");
  }

  // ... (rest of the initialization code)
} catch (error) {
  handleError(error);
}

// Add tooltip functionality
paper.on("cell:mouseenter", function (cellView) {
  const tooltipContent = cellView.model.prop("nodeData/label");
  if (tooltipContent) {
    const tooltip = document.createElement("div");
    tooltip.className = "jointjs-tooltip";
    tooltip.textContent = tooltipContent;
    document.body.appendChild(tooltip);

    cellView.on("mousemove", function (evt) {
      tooltip.style.left = evt.clientX + 10 + "px";
      tooltip.style.top = evt.clientY + 10 + "px";
    });

    cellView.on("mouseleave", function () {
      document.body.removeChild(tooltip);
    });
  }
});

// Function to generate a shareable link
function generateShareableLink() {
  const flowchartData = graph.toJSON();
  const compressedData = LZString.compressToEncodedURIComponent(
    JSON.stringify(flowchartData)
  );
  const shareableLink = `${window.location.origin}${window.location.pathname}?data=${compressedData}`;

  // Display the link to the user
  const linkDisplay = document.getElementById("shareableLinkDisplay");
  linkDisplay.value = shareableLink;
  linkDisplay.style.display = "block";
}

// Attach generate shareable link function to a button
document
  .getElementById("generateLink")
  .addEventListener("click", generateShareableLink);

// Function to load flowchart from shareable link
function loadFromShareableLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const compressedData = urlParams.get("data");
  if (compressedData) {
    try {
      const decompressedData =
        LZString.decompressFromEncodedURIComponent(compressedData);
      const flowchartData = JSON.parse(decompressedData);
      graph.fromJSON(flowchartData);
      fitToContent();
    } catch (error) {
      handleError(new Error("Failed to load flowchart from link"));
    }
  }
}

// Call this function when the page loads
window.addEventListener("load", loadFromShareableLink);

// Add this at the end of your script to ensure all functions are defined before use
console.log("JointJS Flowchart generator initialized successfully");
