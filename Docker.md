
If running this from windows you will need to ensure that the docker VM has mounted the path that you will reference in docker-compose.  If this project lives under your user's home directory, e.g. c:\Users, then you should be all set.  The default Docker toolbox using VirtualBox takes care of this by mounting c:\Users to /c/Users on the virtual machine. 

For example, lets say we are using VirtualBox, the steps would be:
1. Add a Shared Folder for the Virtual Box machine.  This only needs to be done one time for the VirtualBox machine.
1.1. Open VirtualBox console
1.1. Right mouse click on docker VM (probably "default") and select "settings"
1.1. Select the Shared Folders item from the left side menu
1.1. Right-mouse click on Machine Folders and select "Add Shared Folder"
1.1. Enter the following:
     * Folder Path: Enter the path to your folder that contains the folder for the docker volume
     * Folder Name: Enter the name of the folder you want as the "share name" (NOTE: This is not the mount point)
     * Read-only: Unchecked
     * Auto-mount: Checked
     * Make Permenent: Checked
## Click the OK button to create the mount
## Click the OK button to close the settings dialog.
# Open the Docker Quickstart Terminal
# Create a mount point for the Shared Folder. This only needs to be done one time for the VirtualBox machine.
## From the Docker Quickstart Terminal run the following command:
    docker-machine.exe ssh default 'sudo mkdir --parents //<DRIVE_LETTER><PATH>'
##* WHERE:
##** DRIVE_LETTER is your lowecase drive letter (e.g. "c")
##** PATH is the full path of the share (e.g. /Development)
##* Example would be for c:\Development:
    docker-machine.exe ssh default 'sudo mkdir --parents //c/Development'
# Mount the Shared Folder.  This must be done every time the VirtualBox machine is restarted.
## From the Docker Quickstart Terminal run the following command:
    docker-machine.exe ssh default 'sudo mount -t vboxsf <SHARE_NAME> <MOUNT_POINT>'
##* WHERE:
##** SHARE_NAME is the name of your Shared Folder (e.g. c/Development)
##** MOUNT_POINT is the mount point created above (e.g. //c/Development)
##* Example would be for c:\Development:
    docker-machine.exe ssh default 'sudo mount -t vboxsf c/Development //c/Development'

One important thing to note: docker-compose will convert relative volume paths into a full path as would be found on the VirtualBox machine's file system.  
For example:
* You have a folder c:\Development\CTAPI\clinical-trials-search that contains this file.
* You have a data/ctapi folder located at c:\Development\CTAPI\data\CTAPI
* Our docker-compose file references "../data/CTAPI" 
* This would be converted to "/c/Development/CTAPI/data/CTAPI" -- Note Case matters.
* If you have a Shared Folder named "c/Development" mounted to "/c/Development", then everything would work.  

## Run the compose
To start:
1. 'docker-compose up -d'

To Recreate:
1. 'docker-compose stop'
2. 'docker-compose rm'
3. 'docker-compose up -d'


 