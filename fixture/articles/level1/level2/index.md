{
	"title": "Level 2 Root"
}
--
### This is the Level 2 root

This is body text. Link to level 1: <%= link('level1/document2') %>.

Link to root: <%= link('index') %>

This is viewing a partial: <%= partial('partial1', {foo: 'hello', 'bar': 'worldaaaah!! beeeeeeeesss!!'}) %>

To know more about using level 1, see <%= ref('level1usage') %>