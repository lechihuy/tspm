const Excel = require('exceljs')
const fs = require('fs');

let workbook
let tasks = []

async function loadWorkbook() {
    workbook = new Excel.Workbook()
    await workbook.xlsx.readFile('data.xlsx')
}

async function loadTasks() {
    const worksheet = await workbook.getWorksheet('Tasks')

    for (let i = 2; i <= worksheet.rowCount; i++) {
        let row = await worksheet.getRow(i).values;
        const predecessors = String(row[4] ? row[4] : '');
        tasks.push({
            wbs: null,
            key: i,
            task: row[2],
            duration: row[3],
            predecessors: predecessors != '' ? predecessors.split(',').map(item => item.trim()) : [],
            earlyStart: null,
            earlyFinish: null,
            lateStart: null,
            lateFinish: null,
            slack: null,
        })
    }
}

async function resolvePert() {
    for (let i = 0; i < tasks.length; i++) {
        const predecessors = tasks.filter(task => {
            return tasks[i].predecessors.includes(String(task.key))
        })

        if (predecessors.length < 1) {
            tasks[i].earlyStart = 0
        } else if (predecessors.length === 1) {
            tasks[i].earlyStart = predecessors[0].earlyFinish;
        } else if (predecessors.length > 1) {
            const maxPredecessor = predecessors.reduce((max, i) => {
                return i.earlyFinish > max.earlyFinish ? i : max
            });

            tasks[i].earlyStart = maxPredecessor.earlyFinish
        }

        tasks[i].earlyFinish = tasks[i].earlyStart + tasks[i].duration
    }

    for (let i = tasks.length - 1; i >= 0; i--) {
        const predecessors = tasks.filter(task => {
            return task.predecessors.includes(String(tasks[i].key))
        })

        if (predecessors.length < 1) {
            tasks[i].lateFinish = tasks[i].earlyFinish
        } else if (predecessors.length === 1) {
            tasks[i].lateFinish = predecessors[0].lateStart
        } else if (predecessors.length > 1) {
            const minPredecessor = predecessors.reduce((min, i) => {
                return i.lateStart < min.lateStart ? i : min
            });

            tasks[i].lateFinish = minPredecessor.lateStart
        }
        tasks[i].lateStart = tasks[i].lateFinish - tasks[i].duration
        tasks[i].slack = tasks[i].lateStart - tasks[i].earlyStart
    }
}

async function saveTasks() {
    const worksheet = await workbook.getWorksheet('Tasks')

    for (let i = 2; i <= worksheet.rowCount; i++) {
        let row = worksheet.getRow(i);
        row.getCell(5).value = tasks[i - 2].earlyStart;
        row.getCell(6).value = tasks[i - 2].earlyFinish;
        row.getCell(7).value = tasks[i - 2].lateStart;
        row.getCell(8).value = tasks[i - 2].lateFinish;
        row.getCell(9).value = tasks[i - 2].slack;
        row.commit()
    }

    await workbook.xlsx.writeFile('data.xlsx');
}

async function exportChartData() {
    console.log(tasks);
    const nodes = tasks.map((task, index) => ({
        key: index + 2,
        text: task.task,
        length: task.duration,
        Predecessors: task.predecessors.join(','),
        earlyStart: task.earlyStart,
        lateFinish: task.lateFinish,
        critical: task.slack == 0 ? true : false,
    }))

    const nodeLinks = [];
    nodes.forEach((node, index) => {
        const predecessors = node.Predecessors ? node.Predecessors.split(',').map(item => item.trim()) : [];

        if (predecessors.length == 0) {
            nodeLinks.push({
                from: 1,
                to: Number(node.key)
            });
        } else {
            predecessors.forEach(predecessor => {
                nodeLinks.push({
                    from: Number(predecessor),
                    to: Number(node.key)
                });
            });
        }
    });

    nodes.unshift({
        key: 1,
        text: 'Start',
        length: 0,
        Predecessors: '',
        earlyStart: 0,
        lateFinish: 0,
        critical: true,
    })

    fs.writeFile("nodes.json", JSON.stringify(nodes), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to Node data file.");
            return console.log(err);
        }

        console.log("Node data file has been saved.");
    });

    fs.writeFile("nodeLinks.json", JSON.stringify(nodeLinks), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to Link node data file.");
            return console.log(err);
        }

        console.log("Link node data file has been saved.");
    });
}

(async () => {
    await loadWorkbook()
    await loadTasks()
    await resolvePert();
    await saveTasks();
    await exportChartData();
})();

const express = require('express')
const app = express()
const port = 3000

app.use(express.static('public'))

app.get('/chart', (req, res) => {
    res.json({
        nodes: JSON.parse(fs.readFileSync('nodes.json', 'utf8')),
        links: JSON.parse(fs.readFileSync('nodeLinks.json', 'utf8')),
    });
})

app.listen(port, () => {
  console.log(`Open the url http://localhost:${port} to download the PERT chart`)
})
