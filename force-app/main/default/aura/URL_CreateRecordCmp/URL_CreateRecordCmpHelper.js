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

        let helper = this;

        let pageRef = component.get( 'v.pageReference' );

        // Retrieve specific parameters from the URL.
        // For case-insensitivity, the properties are lowercase.
        let urlParamMap = {
            'objectname' : '',      // object whose create form to display
            'recordtypeid' : '',    // record type for new record (optional)
            'recordid' : '',        // id of record where button was clicked
            'actionurl' : ''        // location where hacking started
        };

        for ( let key in pageRef.state ) {
            let lowerKey = key.toLowerCase();
            if ( urlParamMap.hasOwnProperty( lowerKey ) ) {
                urlParamMap[lowerKey] = pageRef.state[key];
            }
        }

        console.log( 'urlParamMap', urlParamMap );

        Promise.resolve()
            .then( function() {
                // workaround for not being able to customize the cancel
                // behavior of the force:createRecord event. instead of
                // the user seeing a blank page, instead load in the background
                // the very record the user is viewing so when they click cancel
                // they are still on the same record.
                let targetUrl;
                if ( !$A.util.isEmpty( urlParamMap.recordid ) ) {
                    targetUrl = '/' + urlParamMap.recordid;
                }
                else if ( !$A.util.isEmpty( urlParamMap.actionurl ) ) {
                    targetUrl = urlParamMap.actionurl;
                }

                if ( !$A.util.isEmpty( targetUrl ) ) {
                    
                    helper.navigateToUrl( targetUrl );
                    // give the page some time to load the new url
                    // otherwise we end up firing the show create form
                    // event too early and the page navigation happens
                    // afterward, causing the quick action modal to disappear.
                    return new Promise( function( resolve, reject ) {
                        setTimeout( resolve, 1000 );
                    });
                }
            })
            .then( function() {
                helper.showCreateForm( component, urlParamMap, pageRef );
            });

    },

    // -----------------------------------------------------------------

    showCreateForm: function( component, urlParamMap, pageRef ) {

        let helper = this;

        helper.enqueueAction( component, 'c.getFieldDescribeMap', {

            'objectName' : urlParamMap.objectname

        }).then( $A.getCallback( function( fieldDescribeMap ) {

            console.log( 'fieldDescribeMap', fieldDescribeMap );

            let eventParamMap = {
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
            for ( let fieldName in pageRef.state ) {
                if ( fieldDescribeMap.hasOwnProperty( fieldName ) && fieldDescribeMap[fieldName].createable ) {
                    // avoid setting lookup fields to undefined, get Error ID: 1429293140-211986 (-590823013), assign to null instead
                    eventParamMap.defaultFieldValues[fieldName] = pageRef.state[fieldName] || null;
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

    navigateToUrl: function( url ) {

        console.log( 'navigating to url', url );

        if ( !$A.util.isEmpty( url ) ) {
            $A.get( 'e.force:navigateToURL' ).setParams({ 'url': url }).fire();
        }

    },

    enqueueAction: function( component, actionName, params, options ) {

        let helper = this;

        return new Promise( function( resolve, reject ) {

            component.set( 'v.showSpinner', true );

            let action = component.get( actionName );

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
    },

    logActionErrors : function( errors ) {
        if ( errors ) {
            if ( errors.length > 0 ) {
                for ( let i = 0; i < errors.length; i++ ) {
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