read progress.md, read todo.md , read architecture.md files, get an idea about the project and the architecture first  and then

create a table for seniority, create a script for initial load data, create a minimal api for seniority, update ui with calling actual seniority api, in onboarding screen

create a table for domain, create a script for initial load data, create a minimal api for domain, update ui with calling actual domain api, in onboarding screen

create a table for tech stack,create a script for initial load data, create a minimal api for tech stack, update ui with calling actual tech stack api, in onboarding screen

make domain and tech stack relational, like front end should have react, typescript etc...
update bytes table, make tags relational against tech stack table, cause tags are nothing but tech stack

update users table, make tech stack (user tech stack )and feed preferences (user preferences) as its own tables 

create a table for interviews, i wanna have a separate table for bytes and interviews, however table structure might be similar to bytes, follow the same for interviews as well like user can view interview, bookmark it, comment on it, so create tables accordingly and APIs as well

create a table for search type, right now only bytes and interviews, create a script for initial load data, create a minimal api for search screen, update ui with calling search screen api, in search screen

now update search controller based on type, if user is searching against bytes, then search against bytes table and likewise

update post screen, right now it's failing, with 400 error
{"title":"Untitled","body":"test byte1 with react","codeSnippet":{"language":"JS","content":"const insight = () => \"ship it\";"},"language":null,"tags":[],"type":"byte"}
{
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    "title": "One or more validation errors occurred.",
    "status": 400,
    "errors": {
        "request": [
            "The request field is required."
        ],
        "$.codeSnippet": [
            "The JSON value could not be converted to ByteAI.Api.ViewModels.CreateByteRequest. Path: $.codeSnippet | LineNumber: 0 | BytePositionInLine: 66."
        ]
    },
    "traceId": "00-b7e193eb323c030e96f75c4b384b0bf5-cb3491f938483ea3-00"
}

once post byte is fixed, i want to auto tag based on the byte content if the byte has interview in it it should be saved to interview tables , if not it should be saved to bytes table

create a logs table and log any errors in that table

add a social table, should be in foreign key relation with user table, like 1 to many

create a badge type table, create a script for initial load data, create a minimal api for badge type , user should have 1 to many with this badge type table, so update the user table accordingly

create a leveltype table, create a script for initial loading of data, user should have 1 to many with this level type table, so update the user table accordingly

make sure there's 2 separate tables for followers and following, simple many to many tables

create a separate table for trending, i want to capture user clicks on a post, based on number of clicks in past 24 hours, i want to show trending page

feedcontroller is calling bytescontroller, filtering is broken when selecting from dropdown like if i select angular, react it's giving me all the available posts, make sure the feed screen has 3 types for you(should be filtering based off of preferences tags), following should be based off of the followers posts, trending should be based on the trending table from above

for all these changes, make sure UI, service and DB changes are applied succesfully

create a separate AIToDo.md guide, modify progress and todo.md guide and move all AIFeatures todo into this new AIToDo.md guide

plan first and implement