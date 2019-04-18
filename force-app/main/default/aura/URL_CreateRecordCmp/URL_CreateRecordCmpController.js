({
    // this method is called when component initializes
    onInit: function( component, event, helper ) {
        helper.handleShowCreateForm( component );
    },
    onPageReferenceChange: function( component, event, helper ) {
        helper.handleShowCreateForm( component );
    }
})