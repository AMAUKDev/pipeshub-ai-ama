#!/bin/bash
echo "Script executed from: ${PWD}"

# Set the file name with the full or relative path
file="../env_name.txt"  # You can adjust this path to the location of the file

# Check if the file exists
if [ -e "$file" ]; then
    # Read the value from the file and save it to a variable
    env_name=$(cat "$file")
    echo "env_name read from the file: $env_name"
    
    mamba env remove -n "$env_name"
else
    echo "The file '$file' does not exist."
fi
