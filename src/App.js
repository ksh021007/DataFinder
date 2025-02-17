import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { debounce } from 'lodash';

function parseCommaText(lines) {
  const stack = [];
  const rootNodes = [];

  lines.forEach((line) => {
    const level = Math.floor(line.match(/^ */)[0].length / 4);
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

function App() {
  const [nodes, setNodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [path, setPath] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nodesToOpen, setNodesToOpen] = useState(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedDepth, setSelectedDepth] = useState('None');
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const nodeRefs = useRef({});

  const fetchFileFromPublic = async () => {
    try {
      const response = await fetch('/sample.txt');
      const text = await response.text();
      const lines = text.split('\n').filter((line) => line.trim() !== '');
      const parsedNodes = parseCommaText(lines);
      setNodes(parsedNodes);
      setSearchResults([]);
    } catch (error) {
      console.error('파일을 불러오는 데 오류가 발생했습니다.', error);
    }
  };

  useEffect(() => {
    fetchFileFromPublic();
  }, []);

  const renderTree = (nodes) => {
    return nodes.map((node) => {
      if (selectedDepth !== 'None' && node.level >= selectedDepth) {
        return null; // 선택한 깊이보다 더 깊은 레벨은 렌더링하지 않음
      }

      return (
        <div key={node.label} style={{ marginLeft: node.level * 20 + 'px' }}>
          <div
            ref={(el) => (nodeRefs.current[node.label] = el)}
            className={`${node.label} ${nodesToOpen.has(node) ? 'open' : ''}`}
            onClick={() => {
              setPath(getPath(node));
              toggleNode(node);
            }}
          >
            {renderIcon(node)}
            {renderHighlightedText(node.label)}
          </div>
          {node.children.length > 0 && nodesToOpen.has(node) && (
            <div>{renderTree(node.children)}</div>
          )}
        </div>
      );
    });
  };

  const getPath = (node) => {
    let pathArray = [];
    let currentNode = node;
    while (currentNode) {
      pathArray.unshift(currentNode.label);
      currentNode = currentNode.parent;
    }
    return pathArray.join(' > ');
  };

  const toggleNode = (node) => {
    setNodesToOpen((prev) => {
      const newNodesToOpen = new Set(prev);
      if (newNodesToOpen.has(node)) {
        newNodesToOpen.delete(node);
      } else {
        newNodesToOpen.add(node);
      }
      return newNodesToOpen;
    });
  };

  const renderIcon = (node) => {
    return node.children && node.children.length > 0 ? (
      <span role="img" aria-label="folder" style={{ marginRight: 8 }}>
        📁
      </span>
    ) : (
      <span role="img" aria-label="document" style={{ marginRight: 8 }}>
        📄
      </span>
    );
  };

  const renderHighlightedText = (text) => {
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={index} className="highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const handleDepthChange = (event) => {
    setSelectedDepth(Number(event.target.value)); // 선택한 깊이를 숫자로 설정
  };

  // 검색어를 입력할 때는 상태만 업데이트
  const handleSearch = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    setSearchTerm(searchTerm);
    setIsDropdownOpen(searchTerm.length > 0); // 검색어가 있으면 드롭다운 열기
  };

  // 검색 버튼 클릭 시 검색 실행
  const handleSearchButtonClick = () => {
    const searchTermLower = searchTerm.toLowerCase();
    setSearchResults([]); //검색결과 초기화
    setIsDropdownOpen(true); // 드롭다운을 열어주는 코드 추가

    debounceSearch(searchTermLower);
  };

  const debounceSearch = useCallback(
    debounce((searchTerm) => {
      let matches = [];
      let openNodes = new Set();

      if (searchTerm) {
        searchNodes(nodes, searchTerm, matches, openNodes);
      }

      if (matches.length === 0) {
        setSearchResults([{ label: '검색결과가 없습니다' }]); // 검색 결과가 없을 때 메시지 설정
      } else {
        setSearchResults(matches); // 검색된 노드를 결과로 설정
      }
      setNodesToOpen(openNodes); // 해당하는 노드들을 열어주는 처리
    }, 1000),
    [nodes]
  );

  const searchNodes = (nodes, searchTerm, matches, openNodes) => {
    nodes.forEach((node) => {
      if (node.label.toLowerCase().includes(searchTerm)) {
        matches.push(node);
        let current = node;
        while (current) {
          openNodes.add(current);
          current = current.parent;
        }
      }
      if (node.children.length > 0) {
        searchNodes(node.children, searchTerm, matches, openNodes);
      }
    });
  };

  const handleSearchResultClick = (node) => {
    setSearchTerm(node.label);
    setSelectedNode(node);
    setPath(getPath(node));
    setIsDropdownOpen(false);
  };

  const handleScrollToNode = () => {
    if (selectedNode) {
      const nodeRef = nodeRefs.current[selectedNode.label];

      if (nodeRef) {
        const rect = nodeRef.getBoundingClientRect();
        const nodeTop = rect.top + window.scrollY;

        window.scrollTo({
          top: nodeTop,
          behavior: 'smooth',
        });
      } else {
        console.error('해당 노드 참조를 찾을 수 없습니다.');
      }
    } else {
      console.error('선택된 노드가 없습니다.');
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleScrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  };

  const fixedPathStyle = {
    position: 'fixed',
    top: '20px',
    left: '370px',
    right: '150px',
    backgroundColor: 'white',
    zIndex: 1000,
    padding: '10px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    fontWeight: 'bold',
  };

  const filteredNodes = nodes;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 엔터 키 눌렀을 때 검색 버튼 클릭 이벤트로 연결
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearchButtonClick();
    }
  };

  return (
    <div className="App">
      <h1>File Explorer</h1>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '80px',
          backgroundColor: '#f5f5f5',
          zIndex: 0,
        }}
      ></div>

      <div style={fixedPathStyle}>
        {path ? `경로: ${path}` : '경로가 없습니다.'}
      </div>

      <div
        style={{
          position: 'fixed',
          top: '25px',
          left: '20px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          ref={searchInputRef}
          placeholder="검색"
          value={searchTerm}
          onChange={handleSearch}
          onKeyPress={handleKeyPress} // 엔터 키 눌렀을 때 검색 실행
          style={{
            marginRight: '10px',
            padding: '8px',
            width: '200px',
            borderRadius: '5px',
            border: '1px solid #ddd',
          }}
        />
        <button
          onClick={handleSearchButtonClick}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '5px',
            border: '1px solid #ddd',
            backgroundColor: '#007bff',
            color: '#fff',
          }}
        >
          검색
        </button>
        <button
          onClick={handleScrollToNode}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '5px',
            border: '1px solid #ddd',
            backgroundColor: '#007bff',
            color: '#fff',
            marginLeft: '10px',
          }}
        >
          이동
        </button>
      </div>

      {isDropdownOpen && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            backgroundColor: 'white',
            top: '60px',
            //bottom: 'auto',
            left: '20px',
            border: '1px solid #ddd',
            width: '215px',
            minHeight: '60px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          {searchResults.map((node) => (
            <div
              key={node.label}
              onClick={() => handleSearchResultClick(node)}
              style={{ padding: '8px', cursor: 'pointer' }}
            >
              {node.label}
            </div>
          ))}
        </div>
      )}

      <div>{renderTree(filteredNodes)}</div>

      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleScrollToTop}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            padding: 0,
          }}
        >
          ↑
        </button>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleScrollToBottom}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            padding: 0,
          }}
        >
          ↓
        </button>
      </div>
      <div
        style={{
          position: 'fixed',
          top: '25px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <select
          value={selectedDepth}
          onChange={handleDepthChange}
          style={{
            padding: '8px',
            width: '120px',
            borderRadius: '5px',
            border: '1px solid #ddd',
          }}
        >
          <option value="None">None</option>
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default App;
