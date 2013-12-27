{
	"title": "Level 1 Root"
}
--
### This is the Level 1 root

This is body text. Link to doc 2: <%= link('level1/document2') %>. Link to itself: <%= level1('doc:level1/index') %>.

<%= anchor('level1usage', "Level 1 Usage") %>
### Using Level 1

This is an embedded example:

<%= rdExample ('ex1') %>

You should be able to use this function: <%= api('Class1', 'example1') %>

