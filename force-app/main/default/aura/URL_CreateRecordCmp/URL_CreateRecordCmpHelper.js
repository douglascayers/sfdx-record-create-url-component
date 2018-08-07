({
    handleShowCreateForm: function( component ) {

        /*
         * Supported URL parameters:
         *   objectName - API name of a standard or custom object (e.g. Account or Project__c)
         *   recordTypeId - which record type to use, if not specified then the user's default record type is assumed
         *
         * All other key=value URL parameters are
         * assumed as default field values for the record form.
         *
         * URL parameter names must match the API field names exactly (case-sensitive).
         * For example, "phone" and "PHONE" will not pre-populate the standard Contact "Phone" field.
         *
         * Example Custom Button URL:
         *     "/lightning/cmp/c__URL_CreateRecordCmp?objectName=Contact&FirstName=Astro&LastName=Nomical&AccountId={!Account.Id}"
         */

        var helper = this;

        var pageRef = component.get( 'v.pageReference' );

        // Retrieve specific parameters from the URL.
        // For case-insensitivity, the properties are lowercase.
        var urlParamMap = {
            'objectname' : '',      // object whose create form to display
            'recordtypeid' : '',    // record type for new record (optional)
            'recordid' : ''         // id of record where button was clicked
        };

        for ( var key in pageRef.state ) {
            var lowerKey = key.toLowerCase();
            if ( urlParamMap.hasOwnProperty( lowerKey ) ) {
                urlParamMap[lowerKey] = pageRef.state[key];
            }
        }

        console.log( 'urlParamMap', urlParamMap );

        if ( !$A.util.isEmpty( urlParamMap.recordid ) ) {
            // workaround for not being able to customize the cancel
            // behavior of the force:createRecord event. instead of
            // the user seeing a blank page, instead load in the background
            // the very record the user is viewing so when they click cancel
            // they are still on the same record.
            helper.navigateToUrl( '/' + urlParamMap.recordid );
        }

        helper.enqueueAction( component, 'c.getFieldDescribeMap', {
            'objectName' : urlParamMap.objectname
        }, {
            'storable' : true
        }).then( $A.getCallback( function( fieldDescribeMap ) {

            console.log( 'fieldDescribeMap', fieldDescribeMap );

            var eventParamMap = {
                'defaultFieldValues' : {}
            };

            if ( !$A.util.isEmpty( urlParamMap.objectname ) ) {
                eventParamMap['entityApiName'] = urlParamMap.objectname;
            }

            if ( !$A.util.isEmpty( urlParamMap.recordtypeid ) ) {
                eventParamMap['recordTypeId'] = urlParamMap.recordtypeid;
            }

            // ensure only fields the current user has permission to create are set
            // otherwise upon attempt to save will get component error
            for ( var fieldName in pageRef.state ) {
                if ( fieldDescribeMap.hasOwnProperty( fieldName ) && fieldDescribeMap[fieldName].createable ) {
                    eventParamMap.defaultFieldValues[fieldName] = pageRef.state[fieldName];
                }
            }

            return eventParamMap;

        })).then( $A.getCallback( function( eventParamMap ) {

            console.log( 'eventParamMap', eventParamMap );

            $A.get( 'e.force:createRecord' ).setParams( eventParamMap ).fire();

        })).catch( $A.getCallback( function( err ) {

            helper.logActionErrors( err );

        }));

    },

    // -----------------------------------------------------------------

    navigateToUrl: function( url ) {

        console.log( 'navigating to url', url );

        if ( !$A.util.isEmpty( url ) ) {
            $A.get( 'e.force:navigateToURL' ).setParams({ 'url': url }).fire();
        }

    },

    enqueueAction: function( component, actionName, params, options ) {

        var helper = this;

        var p = new Promise( function( resolve, reject ) {

            component.set( 'v.showSpinner', true );

            var action = component.get( actionName );

            if ( params ) {
                action.setParams( params );
            }

            if ( options ) {
                if ( options.background ) { action.setBackground(); }
                if ( options.storable )   { action.setStorable(); }
            }

            action.setCallback( helper, function( response ) {

                component.set( 'v.showSpinner', false );

                if ( component.isValid() && response.getState() === 'SUCCESS' ) {

                    resolve( response.getReturnValue() );

                } else {

                    console.error( 'Error calling action "' + actionName + '" with state: ' + response.getState() );

                    helper.logActionErrors( response.getError() );

                    reject( response.getError() );

                }
            });

            $A.enqueueAction( action );

        });

        return p;
    },

    logActionErrors : function( errors ) {
        if ( errors ) {
            if ( errors.length > 0 ) {
                for ( var i = 0; i < errors.length; i++ ) {
                    console.error( 'Error: ' + errors[i].message );
                }
            } else {
                console.error( 'Error: ' + errors );
            }
        } else {
            console.error( 'Unknown error' );
        }
    }
})