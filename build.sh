#!/bin/bash

# Define the output file and the temporary CSS file
HTML_FILE="./src/index.html"
TEMP_CSS_FILE="temp.css"
INPUT_CSS_FILE="./src/styles.css"

# Run the Deno command to generate minified CSS from the input file
deno run npm:tailwindcss -i "$INPUT_CSS_FILE" --minify > "$TEMP_CSS_FILE"

# Check if the command was successful
if [[ $? -ne 0 ]]; then
    echo "Error: Tailwind CSS command failed."
    exit 1
fi

# Read the content of the temporary CSS file
CSS_CONTENT=$(<"$TEMP_CSS_FILE")

# Use a temporary HTML file to store the modified content
TEMP_HTML_FILE="temp_index.html"

# Process the HTML file
{
    while IFS= read -r line; do
        # Check for the <head> tag
        if [[ "$line" == *"<head>"* ]]; then
            echo "$line"  # Print the <head> line

            # Read lines in <head> and skip old <style> tags
            while IFS= read -r next_line; do
                if [[ "$next_line" == *"<style>"* ]]; then
                    # Skip this old <style> tag
                    while IFS= read -r next_line && [[ "$next_line" != *"</style>"* ]]; do
                        # Skip the old <style> content
                        :
                    done
                else
                    echo "$next_line"  # Print lines other than the old <style>
                    # Break if we reach the closing </head> tag
                    [[ "$next_line" == *"</head>"* ]] && break
                fi
            done
            # After processing old styles, add the new <style>
            echo "    <style>"
            echo "$CSS_CONTENT"
            echo "    </style>"
            continue
        fi

        # Print all other lines
        echo "$line"
    done < "$HTML_FILE"
} > "$TEMP_HTML_FILE"

# Move the modified HTML back to the original file
mv "$TEMP_HTML_FILE" "$HTML_FILE"

# Clean up the temporary CSS file
rm "$TEMP_CSS_FILE"

echo "Successfully replaced content of <style> tag in $HTML_FILE."