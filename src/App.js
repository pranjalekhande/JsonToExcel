import React, { useState, useEffect } from 'react';

const App = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setFiles(prevFiles => [...prevFiles, data]);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">JSON to Excel Processor</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Processed Files</h2>
        <ul className="list-disc pl-5">
          {files.map((file, index) => (
            <li key={index} className="mb-2">
              <span className="font-medium">{file.name}</span>
              <span className="ml-2 text-gray-600">Processed at: {file.timestamp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;