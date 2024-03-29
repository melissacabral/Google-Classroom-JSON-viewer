/*
Copyright 2023  Melissa Cabral

Google Classroom JSON Viewer

*/

"use strict";

const DEBUG = false;

document.getElementById("import-upload").addEventListener("click", () => {
    const file = document.getElementById("import-filepicker").files[0];
    const reader = new FileReader();
    reader.readAsText(file);
    reader.addEventListener("load", () => {
        // Parse JSON file and store it in a JS object
        const obj = JSON.parse(reader.result);

        // Populate the view
        createElems(getChildElems(obj), document.getElementById("view"));

        document.body.classList.add('loaded')
        
        const filterButtons = document.querySelectorAll("#topics-list .topic");
        filterButtons.forEach((filter) => {
            filter.addEventListener("click", filterIt);
        });


    });
});


/**
 * Set up all the HTML structure for the viewer
 * Parses an object and returns information about elements to be added as children to the view element
 */
 const getChildElems = (obj) => {
    if (obj.version in parseElems) {
        return(parseElems[obj.version](obj));
    }
    else {
        console.log(
            `Sorry, Classroom Export Viewer does not yet support version ${obj.version}
            of Google Classroom exports.`
            );
    }
};

// A family of functions to parse HTML elements from an object,
// depending on the version
const parseElems = [];
parseElems[1] = (obj) => {
    const childElems = [];
    let background =  "#" +stringToColor(obj.name)
    let textColor = contrastColor(stringToColor(obj.name))
    document.documentElement.style.setProperty('--class-color', background);
    document.documentElement.style.setProperty('--title-text-color', textColor);
    childElems.push({
        id: "title-container",
        type: "div"
    });
    childElems.push({
        id: "class-name",
        type: "h1",
        content: obj.name || "Untitled Class",
        parent: "title-container"
    });

    if (obj.section) childElems.push({
        id: "section",
        type: "p",
        content: `Section: ${obj.section}`,
        parent: "title-container"
    });
        if (obj.room) childElems.push({
            id: "room",
            type: "p",
            content: `Room: ${obj.room}`,
            parent: "title-container"
        });
            if (obj.descriptionHeading) childElems.push({
                id: "orig-name",
                type: "p",
                content: `Original name: ${obj.descriptionHeading}`,
                parent: "title-container"
            });
                if (obj.description){
                    let description = obj.description
                    childElems.push({
                        id: "description",
                        type: "p",
                        parent: "description-container",
                        content: description.autoLink({ target: "_blank" })
                        ,
                        parent: "title-container"

                    });
                } 
    //list all Topics
    if (obj.topics) {
        childElems.push({
            type: "div",
            id: "topics-container",

        });
        childElems.push({
            id: "topics-heading",
            type: "h3",
            content: "Topics",
            parent:"topics-container"
        });
        childElems.push({
            id: "topics-list",
            type: "ul",
            parent:"topics-container"
        });
        childElems.push({
            id: "topic-all",
            type: "li",
            parent:"topics-list",
            content:"View All Posts",
            className: "topic all",
            attrs: {
                "data-filter": "all"
            }
        });
        for (const topic_id in obj.topics){
            const topic = obj.topics[topic_id];
            childElems.push({
                id: `topic-${topic_id}`,
                type: "li",
                className: `topic topic-${topic_id}`,
                content: topic.name,
                parent:"topics-list",
                attrs: {
                    "data-filter": slugify(topic.name)
                }
            });
        }
    } 
     // end topics
     // posts list
     if (obj.posts) childElems.push({
        id: "posts-container",
        type: "div"      
    });
        for (const post_id in obj.posts) {
        // Use index of each post in posts array to give unique IDs
        const post = obj.posts[post_id];
        let topic = post.topics?.[0].name || 'No Topic';
        childElems.push({
            id: `post-${post_id}`,
            type: "div",
            className: 'post ' + slugify(topic),
            parent: "posts-container"
        });

        childElems.push({
            id: `post-${post_id}-topic`,
            type: "strong",
            parent: `post-${post_id}`,
            content: topic ,
            className: "post-topic",
        });

        
        let $title = DEBUG? `post-${post_id} `: '';
        if(post.courseWorkMaterial?.title){
            $title += post.courseWorkMaterial.title
        }  else if (post.courseWork?.title ) {
            $title += post.courseWork.title
        } else{
            $title += "No Title"
        }
        childElems.push({
            id: `post-${post_id}-title`,
            type: "h2",
            parent: `post-${post_id}`,
            content: $title,
            className: "post-title",
        });
        const fmtDateTime = str => new Date(str).toLocaleString();
        if (post.courseWork?.dueTime) childElems.push({
            id: `post-${post_id}-due`,
            type: "strong",
            parent: `post-${post_id}`,
            content: `Due ${fmtDateTime(post.courseWork.dueTime)}`,
            className: "post-due",
        });



            let description = '';
            if(post.courseWorkMaterial?.description){
                description += post.courseWorkMaterial.description
            }  else if (post.courseWork?.description ) {
                description += post.courseWork.description
            } else{
                description += "No Description"
            }
            description = addBreaks(description)
            childElems.push({
                id: `post-${post_id}-desc`,
                type: "p",
                parent: `post-${post_id}`,
                content: description.autoLink({ target: "_blank" }),
                className: "post-desc",
            });



            if (post.materials) childElems.push(
            {
                id: `post-${post_id}-materials`,
                type: "div",
                parent: `post-${post_id}`,
                className: "materials",
            },
            {
                id: `post-${post_id}-materials-heading`,
                type: "h3",
                content: "Materials",
                parent: `post-${post_id}-materials`,
                className: "materials-heading",
            },
            );

                for (const material_id in post.materials) {
                    const material = post.materials[material_id];
                    if (material.form?.formUrl) {
                        childElems.push({
                            id: `post-${post_id}-material-${material_id}-form`,
                            type: "a",
                            parent: `post-${post_id}-materials`,
                            content: material.form.title,
                            className: "material-form",
                            attrs: {
                                "href": material.form.formUrl,
                                "target" : "_blank"
                            },
                        });
                    }
                    if (material.driveFile?.driveFile) {
                        childElems.push({
                            id: `post-${post_id}-material-${material_id}-drive-file`,
                            type: "a",
                            parent: `post-${post_id}-materials`,
                            content: material.driveFile.driveFile.title,
                            className: "material-drive-file",
                            attrs: {
                                "href": material.driveFile.driveFile.alternateLink,
                                "target" : "_blank"

                            },
                        });

                // Make a description including the share mode
                let description = " (on Google Drive";
                switch (material.driveFile.shareMode) {
                    case "VIEW":
                    description += " - students can view file)";
                    break;
                    case "EDIT":
                    description += " - students can edit file)";
                    break;
                    case "STUDENT_COPY":
                    description += " - each student gets a copy)";
                    break;
                    default:
                    description += ")";
                }

                childElems.push(
                {
                    id: `post-${post_id}-material-${material_id}-drive-file-description`,
                    type: "span",
                    parent: `post-${post_id}-materials`,
                    content: description,
                    className: "material-drive-file-description",
                },
                {
                    id: `post-${post_id}-material-${material_id}-drive-file-br`,
                    type: "br",
                    parent: `post-${post_id}-materials`
                },
                );
            }

            if (material.link) childElems.push(
            {
                id: `post-${post_id}-material-${material_id}-link`,
                type: "a",
                parent: `post-${post_id}-materials`,
                content: material.link.title,
                className: "material-link",
                attrs: {
                    "href": material.link.url,
                    "target" : "_blank"

                },
            },
            {
                id: `post-${post_id}-material-${material_id}-link-br`,
                type: "br",
                parent: `post-${post_id}-materials`,
            },
            );
        }
     // Construct a string with basic post information


        // (timestamps and creator)
        let postInfo = [
        post.creationTime ?
        `Created ${fmtDateTime(post.creationTime)}` : null,
        post.publicationTime ?
        `Published ${fmtDateTime(post.publicationTime)}` : null,
        post.updateTime ?
        `Last updated ${fmtDateTime(post.updateTime)}` : null
        ].join(", ");

        // Add post's creator's name and/or email address to postInfo
        if (post.creator?.name?.fullName) {
            if (postInfo) postInfo += " by " + post.creator.name.fullName;
            else postInfo = "Created by " + post.creator.name.fullName;
            if (post.creator.emailAddress)
                postInfo += ` <${post.creator.emailAddress}>`;
        }
        else if (post.creator?.emailAddress) {
            if (postInfo) postInfo += ` by <${post.creator.emailAddress}>`;
            else postInfo = `Created by <${post.creator.emailAddress}>`
        }


    childElems.push({
        id: `post-${post_id}-info`,
        type: "div",
        parent: `post-${post_id}`,
        content: postInfo,
        className: "post-info",
    });

    const submissionsLength = (post.courseWork?.submissions || []).length;

        // Check if there is more than one submission (teacher account)
        if (submissionsLength > 1) {
            childElems.push({
                id:`post-${post_id}-submissions-toggle`,
                type: "input",
                parent: `post-${post_id}`,
                attrs: {
                  "type": "button",
                  "value": "Show student submissions"
              },
              onclick: function onclick(_this) {
                  toggleElem(`post-${post_id}-submissions`)();
                  if (_this.value == "Show student submissions") _this.value = "Hide student submissions";else _this.value = "Show student submissions";
              }
          }, 
          {
            id: `post-${post_id}-submissions`,
            type: "div",
            parent: `post-${post_id}`,
            className: "submissions",
            style: {
                "display": "none"
            }
        },
        {
            id: `post-${post_id}-submissions-heading`,
            type: "h3",
            content: "Submissions",
            parent: `post-${post_id}-submissions`,
            className: "submissions-heading",
        },
        );
        }

        if (submissionsLength > 0) {
            for (const submission_id in post.courseWork.submissions) {
                const submission = post.courseWork.submissions[submission_id];

                childElems.push(
                {
                    id: `post-${post_id}-submission-${submission_id}`,
                    type: "div",
                    parent: submissionsLength > 1 ?
                    `post-${post_id}-submissions` :
                    `post-${post_id}`,
                    className: "submission",
                },
                {
                    id: `post-${post_id}-submission-${submission_id}-heading`,
                    type: "h4",
                        // Add name/email of student if there is >1 submission
                        content: 
                        (submissionsLength > 1 && submission.student?.profile ?
                            (`${submission.student.profile.name?.fullName}`
                               || `<${submission.student.profile.emailAddress}>`) :
                            ""),
                        parent: `post-${post_id}-submission-${submission_id}`,
                        className: "submission-heading",
                    },
                    );

                for (const attachment_id in submission.assignmentSubmission?.attachments) {
                    const attachment = submission.assignmentSubmission.attachments[attachment_id];

                    if (attachment.driveFile) {
                        childElems.push({
                            id: `post-${post_id}-submission-${submission_id}-attachment-${attachment_id}-drive-file`,
                            type: "a",
                            parent: `post-${post_id}-submission-${submission_id}`,
                            content: attachment.driveFile.title,
                            className: "submission-drive-file",
                            attrs: {
                                "href": attachment.driveFile.alternateLink,
                                "target" : "_blank"

                            },
                        });

                        childElems.push(
                        {
                            id: `post-${post_id}-submission-${submission_id}-attachment-${attachment_id}-drive-file-description`,
                            type: "span",
                            parent: `post-${post_id}-submission-${submission_id}`,
                            content: " (on Google Drive)",
                            className: "submission-drive-file-description",
                        },
                        {
                            id: `post-${post_id}-submission-${submission_id}-attachment-${attachment_id}-drive-file-br`,
                            type: "br",
                            parent: `post-${post_id}-submission-${submission_id}`,
                        },
                        );
                    }
                }

                if (submission.shortAnswerSubmission) {
                    childElems.push({
                        id: `post-${post_id}-submission-${submission_id}-short-answer`,
                        type: "p",
                        parent: `post-${post_id}-submission-${submission_id}`,
                        content: "Short answer: " +
                        (submission.shortAnswerSubmission.answer || ""),
                        className: "submission-short-answer",
                    });
                }
            }
        }
    }

    return childElems;
};

/**
 * Toggle visibility of any element with an ID
 */
 const toggleElem = (id) => () => {
    const elem = document.getElementById(id);
    if (elem.style.display == "none") elem.style.display = "";
    else elem.style.display = "none";
};
/**
 * Convert human-friendly strings into slugs
 * @param  {str} str the string with captial letters and spaces like "Classroom Materials"
 * @return {str}     a slug like "classroom-materials"
 */
 const slugify = function(str) {
  return str
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/[\s_-]+/g, '-')
  .replace(/^-+|-+$/g, '');
}

/**
 * Convert any string into a color
 * @param  {str} str any string
 * @return {str}     6-digit color code
 */
 const stringToColor = function(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
}
let color = ''
for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
}
return color;
}
/**
 * Get white or black based on background color
 * @param  {string} bgColor hex color of background
 * @return {string}        'black' or 'white'
 */
function contrastColor(hexcolor){
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? 'black' : 'white';
}
/**
 * Filter by Topic
 */
const filterIt = (e) => {
    //get all .current and remove
    let current = document.querySelectorAll( `.current` );
    current.forEach((el) => {el.classList.remove('current')});
    //add .current to this element

    e.target.classList.add('current');
    let selectedFilter = e.target.dataset.filter;
    let itemsToShow = document.querySelectorAll( `#posts-container .post` );
    let itemsToHide = [];


    if (selectedFilter != 'all') {

        itemsToHide = document.querySelectorAll( `#posts-container .post:not(.${selectedFilter})` );
        itemsToShow = document.querySelectorAll( `#posts-container .post.${selectedFilter}` );
    }else{
    }

    itemsToHide.forEach((item) => {
        item.classList.add("hide");
        item.classList.remove("show");
    });
    itemsToShow.forEach((item) => {
        item.classList.add("show");
        item.classList.remove("hide");
    });
}
/**
 * Convert break characters to <br>
 */
 const addBreaks = (str) => str.replace(/(?:\r\n|\r|\n)/g, '<br>');

/**
 * Create HTML elements according to data from getChildElems and add them to the area where class data will be displayed (the view)
 */
const createElems = (childElems, view) => {
    // Clear the view
    view.innerHTML = "";

    // Object to store HTML elements within the view
    const elements = {};

    // Create elements according to data from getChildElems
    for (const elem of childElems) {
        if (elements[elem.id] || document.getElementById(elem.id)) {
            console.log(
                `Internal error in function getChildElems: duplicate ID "${elem.id}" detected.`
                );
            return;
        }

        // Create an element with the proper type and store it in an object
        const elemObj = document.createElement(elem.type);
        elements[elem.id] = elemObj;
        // Stored ID coincides with ID in DOM for convenience
        elemObj.id = elem.id;

        // Set the text content of the element
        elemObj.innerHTML = elem.content || "";

        // Set any initial style overrides
        for (const key in elem.style) {
            elemObj.style.setProperty(key, elem.style[key]);
        }

        // Set attributes
        for (const key in elem.attrs) {
            elemObj.setAttribute(key, elem.attrs[key]);
        }

        // Add HTML classes
        elemObj.className += elem.className || "";

        // Add onclick event listener, passing in elemObj as an argument
        if (elem.onclick) {
            elemObj.addEventListener("click", () => elem.onclick(elemObj));
        }

        // Add the element to its parent, which must be the view (default)
        // or a child thereof (in which case it would have an id in
        // the object `elements`)
        (elements[elem.parent] || view).appendChild(elements[elem.id]);
    }

    return elements;
};
/**
 * Autolink function
 * @see https://github.com/bryanwoods/autolink-js
 * @return {[type]} [description]
 */
 (function() {
  var autoLink,
  slice = [].slice;

  autoLink = function() {
    var callback, k, linkAttributes, option, options, pattern, v;
    options = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    pattern = /(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
    if (!(options.length > 0)) {
      return this.replace(pattern, "$1<a href='$2'>$2</a>");
  }
  option = options[0];
  callback = option["callback"];
  linkAttributes = ((function() {
      var results;
      results = [];
      for (k in option) {
        v = option[k];
        if (k !== 'callback') {
          results.push(" " + k + "='" + v + "'");
      }
  }
  return results;
})()).join('');
  return this.replace(pattern, function(match, space, url) {
      var link;
      link = (typeof callback === "function" ? callback(url) : void 0) || ("<a href='" + url + "'" + linkAttributes + ">" + url + "</a>");
      return "" + space + link;
  });
};

String.prototype['autoLink'] = autoLink;

}).call(this);

