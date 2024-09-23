const express = require('express');
const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

const inboxDir = path.join(__dirname, 'inbox');
const processedExcelDir = path.join(__dirname, 'processed', 'excel');
const processedJsonDir = path.join(__dirname, 'processed', 'json');

// Ensure directories exist
async function ensureDirectories() {
  for (const dir of [inboxDir, processedExcelDir, processedJsonDir]) {
    try {
      await fs.access(dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dir, { recursive: true });
      } else {
        throw error;
      }
    }
  }
}




// Calls the function to ensure directories exist
ensureDirectories().then(() => {
  console.log('Directories created or verified');
}).catch(error => {
  console.error('Error creating directories:', error);
  process.exit(1);
});




// Watch for new files in the inbox
chokidar.watch(inboxDir).on('add', (filepath) => {
  console.log(`New file detected: ${filepath}`);
  processFile(filepath);
});





async function processFile(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    const jsonData = JSON.parse(data);
    
    const workbook = new ExcelJS.Workbook();
    
    // Process each student
    jsonData.forEach(student => {
      const sheet = workbook.addWorksheet(student.record_id);
      
      // Add student info
      sheet.getCell('A1').value = `${student.student_name}, ${student.bu_id}, ${student.program_of_study}`;
      sheet.getCell('A2').value = `# of Enrolled Courses: ${student.courses.length}`;
      
      // Add course headers
      const headers = ['Course ID', 'Course Name', 'Section', 'Start Time', 'Duration', 'Building Code', 'Room Number', 'Credits'];
      sheet.getRow(4).values = headers;
      
      // Add course data
      student.courses.forEach((course, index) => {
        const row = sheet.getRow(index + 5);
        row.values = [
          course.course_id,
          course.course_name,
          course.course_section,
          course.start_time,
          course.duration,
          course.building_code,
          course.room_number,
          course.course_credits
        ];
      });
    });
    
    // Add cover sheet
    const coverSheet = workbook.addWorksheet('Cover', { active: true });
    coverSheet.getCell('A1').value = `${jsonData[0].semester}, ${new Date().getFullYear()}`;
    coverSheet.getCell('A2').value = `Total Students: ${jsonData.length}`;
    coverSheet.getCell('A3').value = `Report Generated on: ${new Date().toLocaleString()}`;
    
    // Generate filename
    const clientId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const outputFilename = `${clientId}__${timestamp}.xlsx`;
    const outputPath = path.join(processedExcelDir, outputFilename);
    
    // Save the workbook
    await workbook.xlsx.writeFile(outputPath);
    console.log(`Excel file created: ${outputPath}`);
    
    // Move and rename the processed JSON file
    const processedJsonFilename = `${path.basename(filepath, '.json')}_${timestamp}.json`;
    const processedJsonPath = path.join(processedJsonDir, processedJsonFilename);
    await fs.rename(filepath, processedJsonPath);
    console.log(`JSON file moved and renamed: ${processedJsonPath}`);

    // Emit event to the frontend
    const eventData = {
      name: outputFilename,
      timestamp: new Date().toLocaleString(),
    };
    clients.forEach(client => client.response.write(`data: ${JSON.stringify(eventData)}\n\n`));
  } catch (error) {
    console.error('Error processing file:', error);
  }
}





// Store connected clients
const clients = new Set();

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const client = { id: Date.now(), response: res };
  clients.add(client);

  req.on('close', () => {
    clients.delete(client);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});