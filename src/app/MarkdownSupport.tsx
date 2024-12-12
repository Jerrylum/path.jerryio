// no prettier

import { Divider, Typography } from "@mui/material";
import { MDXComponents } from "mdx/types";

const MarkdownOverwrittenComponents: MDXComponents = {
  /*
  Read: https://mdxjs.com/table-of-components/
  The components you can overwrite use their standard HTML names. 
  Normally, in markdown, those names are: a, blockquote, br, code, em, h1, h2, h3, h4, h5, h6, hr, img, li, ol, p, pre, strong, and ul. 
  you can also use: del, input, section, sup, table, tbody, td, th, thead, and tr.
  */

  a: (props) => <a {...props} target="_blank" rel="noreferrer" />, // eslint-disable-line jsx-a11y/anchor-has-content
  // keep blockquote, but modify it in CSS
  // keep br
  code: (props) => <Typography component="code" variant="body1">{props.children}</Typography>,
  // keep em
  h1: (props) => <Typography gutterBottom variant="h1">{props.children}</Typography>,
  h2: (props) => <Typography gutterBottom variant="h2">{props.children}</Typography>,
  h3: (props) => <Typography gutterBottom variant="h3">{props.children}</Typography>,
  h4: (props) => <Typography gutterBottom variant="h4">{props.children}</Typography>,
  h5: (props) => <Typography gutterBottom variant="h5">{props.children}</Typography>,
  h6: (props) => <Typography gutterBottom variant="h6">{props.children}</Typography>,
  hr: (props) => <Divider sx={{ margin: "1rem 0" }} />,
  img: (props) => <img {...props} className="markdown-style" />, // eslint-disable-line jsx-a11y/alt-text
  li: (props) => <Typography component="li" variant="body1">{props.children}</Typography>,
  ol: (props) => <Typography component="ol" variant="body1" className="markdown-style">{props.children}</Typography>,
  p: (props) => <Typography paragraph variant="body1" >{props.children}</Typography>,
  // keep pre
  // keep strong
  ul: (props) => <Typography component="ul" variant="body1" className="markdown-style">{props.children}</Typography>,
  // keep del
  // keep input
  // keep section
  // keep sup
  // keep table
  // keep tbody
  td: (props) => <td {...props}><Typography component="span" variant="body1">{props.children}</Typography></td>,
  th: (props) => <th {...props}><Typography component="span" variant="body1">{props.children}</Typography></th>,
  // keep thead
  // keep tr
};

export { MarkdownOverwrittenComponents };
