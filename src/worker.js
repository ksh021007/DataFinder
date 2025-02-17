// src/worker.js
onmessage = function (e) {
  const lines = e.data;
  const parsedData = parseCommaText(lines);
  postMessage(parsedData); // 처리된 데이터를 메인 스레드로 반환
};

// 텍스트 파일 파싱
function parseCommaText(lines) {
  const stack = [];
  const rootNodes = [];

  lines.forEach((line) => {
    const level = Math.floor(line.match(/^ */)[0].length / 4); // 4 spaces per level
    const label = line.slice(level * 4).trim();
    const node = { label, children: [], level };

    if (level === 0) {
      rootNodes.push(node);
      stack[level] = node;
    } else {
      const parent = stack[level - 1];
      if (parent) {
        node.parentLabel = parent.label;
        node.parent = parent;
        parent.children.push(node);
        stack[level] = node;
      }
    }
  });

  return rootNodes;
}
