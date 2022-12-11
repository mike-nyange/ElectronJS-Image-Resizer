const os = require('os');
const path = require('path');
const fs = require('fs');
const resizeImg = require('resize-img');
const {app, Menu, BrowserWindow, ipcMain, shell} = require('electron');
const isMac = process.platform === 'darwin';
process.env.NODE_ENV = 'production';
const isDev = process.env.NODE_ENV != 'production';

let mainWindow

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: "Image Resizer",
        width: isDev ? 1000 : 500,
        height: 600,
        webPreferences: {
            contextIsolation:true,
            nodeIntegration:true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    //open devtools if in dev env

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

//Create about window
function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: "About Image Resizer",
        width: 400,
        height: 500
    });

    //open devtools if in dev env

   

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}


// App is ready
app.whenReady().then(() => {
    createMainWindow();

    //Menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu)

    // Remove mainWindow from memory on close
    mainWindow.on('closed', () => (mainWindow = null))

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow()
        }
      });
});

//Menu template

const menu = [
    
    {
    // label: 'File',
    // submenu: [
    //     {
    //         label: 'Quit',
    //         click: () => app.quit(),
    //         accelerator: 'CmdOrCtr+W'
    //     }
    // ]
    role: 'fileMenu',
    },
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label:'About',
                click: createAboutWindow
            }
        ]
    }] : []),
    ...(!isMac ? [{
        label:"Help",
        submenu: [{
            label: 'About',
            click: createAboutWindow
        }]
    }] : []),

];


// Respond to ipcRenderer resize
ipcMain.on('image:resize', (e, options) => {
    options.dest = path.join(os.homedir(), 'imageresizer');
    resizeImage(options);
})

//Resize the image
async function resizeImage({imgPath, width, height, dest}) {
    try{
        const newPath = await resizeImg(fs.readFileSync(imgPath), {
            width: +width,
            height: +height
        });
        //create file name
        const filename = path.basename(imgPath);
        //create folder if it does not exist
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        //write file to destination
        fs.writeFileSync(path.join(dest, filename), newPath)
        //Send success message to the renderer
        mainWindow.webContents.send('image:done')
        //open destination folder
        shell.openPath(dest);
    }catch(error) {
        console.log(error);
    }
}


app.on('window-all-closed', () => {
    if ( !isMac) {
      app.quit()
    }
  })